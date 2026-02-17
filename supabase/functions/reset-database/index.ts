import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin credentials
    const anonClient = createClient(supabaseUrl, anonKey);
    const { error: authError } = await anonClient.auth.signInWithPassword({ email, password });
    if (authError) {
      return new Response(JSON.stringify({ error: "Mot de passe incorrect" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: users } = await adminClient.auth.admin.listUsers();
    const adminUser = users?.users?.find(u => u.email === email);
    if (!adminUser) {
      return new Response(JSON.stringify({ error: "Utilisateur non trouvé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete data from tables in correct order (respecting FK constraints)
    const tables = ['access_logs', 'payments', 'audit_logs', 'expenses', 'subscriptions', 'members'];
    const results: Record<string, string> = {};

    for (const table of tables) {
      const { error } = await adminClient.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      results[table] = error ? error.message : 'cleared';
    }

    return new Response(JSON.stringify({ message: "Base réinitialisée", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
