import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: { user: caller } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!caller) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Check caller has settings_access permission via group
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("group_id, permission_groups(permissions)")
    .eq("user_id", caller.id)
    .limit(1)
    .single();
  
  const permissions = (roleData?.permission_groups as any)?.permissions;
  if (!permissions?.settings_access) {
    return new Response(JSON.stringify({ error: "Accès réservé — permission settings_access requise" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { userId, newPassword } = await req.json();

  if (!userId || !newPassword) {
    return new Response(JSON.stringify({ error: "Champs obligatoires manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (newPassword.length < 6) {
    return new Response(JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ message: "Mot de passe modifié avec succès" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
