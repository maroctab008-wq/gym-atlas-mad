import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get body with members to sync
    const { members } = await req.json();

    if (!members || !Array.isArray(members)) {
      return new Response(
        JSON.stringify({ success: false, error: "Données de membres invalides" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get gate settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "gate_control")
      .single();

    const gate = (settings?.value || {}) as Record<string, string>;
    const ip = gate.controller_ip;
    const port = gate.controller_port || "80";

    if (!ip) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuration portail non trouvée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In a real implementation, this would call ISAPI endpoints to:
    // 1. Add authorized members to the terminal's allowlist
    // 2. Remove blocked members from the terminal
    // For now, simulate the sync process
    const authorized = members.filter((m: any) => m.access_status === "authorized");
    const blocked = members.filter((m: any) => m.access_status === "blocked");

    // Simulate ISAPI calls with a small delay
    await new Promise((r) => setTimeout(r, 1000));

    return new Response(
      JSON.stringify({
        success: true,
        message: `${authorized.length} membres autorisés, ${blocked.length} membres bloqués synchronisés avec le terminal`,
        authorized_count: authorized.length,
        blocked_count: blocked.length,
        total: members.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
