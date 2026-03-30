import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const method = req.method;

    if (method === "GET") {
      // List all users with roles and usage
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: usages } = await supabase
        .from("user_usage")
        .select("*")
        .eq("month", currentMonth);

      const combined = (authUsers || []).map((u: any) => {
        const role = (roles || []).find((r: any) => r.user_id === u.id);
        const usage = (usages || []).find((us: any) => us.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          role: role?.role || "user",
          credits_limit: role?.credits_limit ?? 250,
          is_blocked: role?.is_blocked ?? false,
          searches_used: usage?.searches_used ?? 0,
        };
      });

      return new Response(JSON.stringify(combined), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "PATCH") {
      const { user_id, credits_limit, is_blocked } = await req.json();
      if (!user_id) throw new Error("user_id required");

      const updateData: any = {};
      if (credits_limit !== undefined) updateData.credits_limit = credits_limit;
      if (is_blocked !== undefined) updateData.is_blocked = is_blocked;

      // Upsert role row
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .eq("role", "user")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_roles")
          .update(updateData)
          .eq("id", existing.id);
      } else {
        await supabase.from("user_roles").insert({
          user_id,
          role: "user",
          credits_limit: credits_limit ?? 250,
          is_blocked: is_blocked ?? false,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
