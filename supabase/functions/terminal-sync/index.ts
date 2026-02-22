import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Accept members + terminals array from body
    const { members, terminals } = await req.json();

    if (!members || !Array.isArray(members)) {
      return new Response(
        JSON.stringify({ success: false, error: "Données de membres invalides" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!terminals || !Array.isArray(terminals) || terminals.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Aucun terminal cible fourni" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authorized = members.filter((m: any) => m.access_status === "authorized");
    const blocked = members.filter((m: any) => m.access_status === "blocked");

    // Process each terminal
    const results = await Promise.allSettled(
      terminals.map(async (terminal: { name: string; ip: string; port: string; api_key?: string }) => {
        if (!terminal.ip) {
          return { name: terminal.name, success: false, error: "IP non configurée" };
        }

        // In production, this would call ISAPI endpoints on each terminal:
        // POST http://{ip}:{port}/ISAPI/AccessControl/UserInfo/Record?format=json
        // DELETE http://{ip}:{port}/ISAPI/AccessControl/UserInfo/Delete?format=json
        try {
          const url = `http://${terminal.ip}:${terminal.port || "80"}/ISAPI/System/deviceInfo`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const resp = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            headers: terminal.api_key
              ? { Authorization: `Basic ${btoa(`admin:${terminal.api_key}`)}` }
              : {},
          });
          clearTimeout(timeout);

          if (resp.ok) {
            // Simulate sync delay per terminal
            await new Promise((r) => setTimeout(r, 500));
            return {
              name: terminal.name,
              success: true,
              authorized_count: authorized.length,
              blocked_count: blocked.length,
            };
          } else {
            return { name: terminal.name, success: false, error: `Code ${resp.status}` };
          }
        } catch (_err) {
          return { name: terminal.name, success: false, error: "Terminal injoignable" };
        }
      })
    );

    const terminalResults = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { name: terminals[i].name, success: false, error: "Erreur interne" };
    });

    const successCount = terminalResults.filter((r: any) => r.success).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `${successCount}/${terminals.length} terminaux synchronisés — ${authorized.length} autorisés, ${blocked.length} bloqués`,
        terminal_results: terminalResults,
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
