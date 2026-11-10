import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckResult = {
  ok: boolean;
  details?: unknown;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const { data: userInfo } = await supabaseClient.auth.getUser();
    const user = userInfo.user;
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: roles } = await supabaseClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r) => r.role === "admin");
    const isManager = roles?.some((r) => r.role === "manager");

    // Checks
    const checks: Record<string, CheckResult> = {};

    // Sales visibility check
    {
      const { data, error } = await supabaseClient
        .from("sales")
        .select("id,cashier_id,branch_id")
        .limit(5);
      if (error) {
        checks.sales_select = { ok: false, details: error.message };
      } else {
        const unauthorizedRow = (data ?? []).find(
          (row) => row.cashier_id !== user.id && !isAdmin && !isManager
        );
        checks.sales_select = { ok: !unauthorizedRow, details: data };
      }
    }

    // Cash registers visibility check
    {
      const { data, error } = await supabaseClient
        .from("cash_registers")
        .select("id,operator_id,status")
        .limit(5);
      if (error) {
        checks.cash_registers_select = { ok: false, details: error.message };
      } else {
        const unauthorizedRow = (data ?? []).find(
          (row) => row.operator_id !== user.id && !isAdmin && !isManager
        );
        checks.cash_registers_select = { ok: !unauthorizedRow, details: data };
      }
    }

    // Inventory movements visibility (should be within owner's branches)
    {
      const { data, error } = await supabaseClient
        .from("inventory_movements")
        .select("id,branch_id,product_id,user_id")
        .limit(5);
      checks.inventory_movements_select = { ok: !error, details: error ? error.message : data };
    }

    return new Response(JSON.stringify({ userId: user.id, roles, checks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

