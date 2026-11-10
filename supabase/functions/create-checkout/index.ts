import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://esm.sh/zod@3.25.76";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const Schema = z
      .object({
        priceId: z.string().min(1),
        successUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
        email: z.string().email().optional().or(z.literal("")),
        password: z.string().optional().or(z.literal("")),
        fullName: z.string().optional().or(z.literal("")),
      })
      .refine(
        (b) => {
          const hasSignupFields = (b.email && b.email.length > 0) || (b.password && b.password.length > 0) || (b.fullName && b.fullName.length > 0);
          if (!hasSignupFields) return true;

          const isEmailValid = z.string().email().safeParse(b.email).success;
          const isPassValid = b.password && b.password.length >= 8;
          const isNameValid = b.fullName && b.fullName.length >= 2;

          return isEmailValid && isPassValid && isNameValid;
        },
        { message: "Para novo cadastro, informe email válido, senha (min 8) e nome completo (min 2)" }
      );

    const { priceId, successUrl, cancelUrl, email, password, fullName } =
      Schema.parse(body);

    const PURCHASE_TYPES: Record<string, string> = {
      'price_1SgboBFzQUTRMRx949NdZWXK': 'branch',
      'price_1SgbpMFzQUTRMRx9DW9uWgqu': 'users',
      'price_1SUxt0FqKVbDv7y3nchHbtpx': 'branch',
      'price_1SVEB7FqKVbDv7y33EZcms8e': 'users'
    };
    const purchaseType = PURCHASE_TYPES[priceId] || 'unknown';

    const isNewSignup = !!(email && (password || "").length >= 8 && (fullName || "").length >= 2);
    let authenticatedUserId: string | undefined;
    let authenticatedUserEmail: string | undefined;

    if (!isNewSignup) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );

      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("Authentication required");
      }

      const token = authHeader.replace("Bearer ", "");
      const { data, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !data.user) {
        throw new Error("User not authenticated");
      }

      authenticatedUserId = data.user.id;
      authenticatedUserEmail = data.user.email;
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const customerEmail = isNewSignup ? email : authenticatedUserEmail;

    let price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (e: any) {
      throw new Error(`Stripe API Error: ${e.message}`);
    }

    let customerId;
    if (customerEmail) {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const defaultSuccessUrl = isNewSignup
      ? `${req.headers.get("origin")}/payment-success`
      : `${req.headers.get("origin")}/settings?tab=branch&success=true`;
    const defaultCancelUrl = isNewSignup
      ? `${req.headers.get("origin")}/signup`
      : `${req.headers.get("origin")}/settings?tab=branch&canceled=true`;

    const mode = price.type === 'recurring' ? 'subscription' : 'payment';

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      allow_promotion_codes: true,
      metadata: {
        purchaseType,
        ...(isNewSignup
          ? { email, password, fullName }
          : { userId: authenticatedUserId }
        )
      }
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
