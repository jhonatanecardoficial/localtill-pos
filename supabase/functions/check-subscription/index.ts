import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, returning default limits");
      return new Response(JSON.stringify({
        subscribed: true,
        branches_limit: 1,
        users_limit: 4
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });

    // Calculate limits based on active subscriptions
    let branchesLimit = 1; // Base: 1 branch
    let usersLimit = 4;    // Base: 4 users (admin + 3)

    const branchPriceId = "price_1SUxt0FqKVbDv7y3nchHbtpx";
    const usersPriceId = "price_1SVEB7FqKVbDv7y33EZcms8e";

    for (const subscription of subscriptions.data) {
      for (const item of subscription.items.data) {
        if (item.price.id === branchPriceId) {
          // Add additional branches purchased (not increment the base)
          branchesLimit += item.quantity;
          logStep("Branch subscription found", { quantity: item.quantity, newLimit: branchesLimit });
        }
        if (item.price.id === usersPriceId) {
          usersLimit += (item.quantity * 10);
          logStep("Users subscription found", { quantity: item.quantity });
        }
      }
    }

    logStep("Calculated limits", { branchesLimit, usersLimit });

    // Update subscription limits in database using service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        branches_limit: branchesLimit,
        users_limit: usersLimit,
        status: 'active',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      logStep("Error updating subscription", { error: updateError });
    } else {
      logStep("Subscription limits updated in database");
    }

    return new Response(JSON.stringify({
      subscribed: true,
      branches_limit: branchesLimit,
      users_limit: usersLimit
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
