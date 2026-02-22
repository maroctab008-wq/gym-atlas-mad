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

    const body = await req.json().catch(() => ({}));
    const { ip, port = "80", username = "admin", password = "" } = body;

    if (!ip) {
      return new Response(
        JSON.stringify({ success: false, error: "Adresse IP non fournie" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ISAPI connection to Hikvision DS-K1T321MFWX terminal
    const url = `http://${ip}:${port}/ISAPI/System/deviceInfo`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
      });
      clearTimeout(timeout);

      if (resp.ok) {
        return new Response(
          JSON.stringify({ success: true, message: "Connexion au terminal réussie" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (resp.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: "Identifiants incorrects (nom d'utilisateur ou mot de passe)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: `Terminal a répondu avec le code ${resp.status}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (_fetchErr) {
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
