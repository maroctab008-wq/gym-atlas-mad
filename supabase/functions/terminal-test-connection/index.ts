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

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get gate settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "gate_control")
      .single();

    if (!settings?.value) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuration portail non trouvée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gate = settings.value as Record<string, string>;
    const ip = gate.controller_ip;
    const port = gate.controller_port || "80";

    if (!ip) {
      return new Response(
        JSON.stringify({ success: false, error: "Adresse IP non configurée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Attempt ISAPI connection to Hikvision terminal
    const url = `http://${ip}:${port}/ISAPI/System/deviceInfo`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const resp = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: gate.api_key
          ? { Authorization: `Basic ${btoa(`admin:${gate.api_key}`)}` }
          : {},
      });
      clearTimeout(timeout);

      if (resp.ok) {
        return new Response(
          JSON.stringify({ success: true, message: "Connexion au terminal réussie" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: `Terminal a répondu avec le code ${resp.status}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (fetchErr) {
      return new Response(
        JSON.stringify({ success: false, error: "Impossible de joindre le terminal. Vérifiez l'IP et le réseau." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
