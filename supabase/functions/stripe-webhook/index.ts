import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe signature");

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("Webhook secret missing");

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const {
        email,
        password,
        fullName,
        userId,
        purchaseType = 'branch'
      } = session.metadata || {};

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      let targetUserId = userId;

      if (!targetUserId) {
        if (!email || !password || !fullName) {
          return new Response(JSON.stringify({ error: "Missing metadata" }), { status: 400 });
        }

        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (userError) throw userError;
        targetUserId = userData.user.id;
      }

      const amount = session.amount_total ? session.amount_total / 100 : 0;
      await supabaseAdmin
        .from("purchases")
        .insert({
          user_id: targetUserId,
          stripe_payment_intent_id: session.payment_intent as string,
          item_type: purchaseType,
          amount: amount,
          currency: session.currency || 'usd',
          status: 'completed'
        });

      const updateData: any = {
        stripe_customer_id: session.customer as string,
        status: 'active',
        updated_at: new Date().toISOString()
      };

      if (session.subscription) {
        updateData.stripe_subscription_id = session.subscription as string;
      }

      if (userId) {
        const { data: currentSub } = await supabaseAdmin
          .from("subscriptions")
          .select("branches_limit, users_limit")
          .eq("user_id", targetUserId)
          .single();

        if (currentSub) {
          if (purchaseType === 'branch') {
            updateData.branches_limit = currentSub.branches_limit + 1;
          } else if (purchaseType === 'users') {
            updateData.users_limit = currentSub.users_limit + 10;
          }
        }
      }

      const { error: subError } = await supabaseAdmin
        .from("subscriptions")
        .update(updateData)
        .eq("user_id", targetUserId);

      if (subError) throw subError;

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
