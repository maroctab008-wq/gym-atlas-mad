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

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: { user: caller } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!caller) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Check admin role
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", caller.id).limit(1).single();
  if (!roleData || roleData.role !== "admin") {
    return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const body = await req.json();
  const action = body.action || 'create';

  // Handle toggle_status action
  if (action === 'toggle_status') {
    const { userId, status } = body;
    if (!userId || !status) {
      return new Response(JSON.stringify({ error: "userId et status requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ message: "Statut mis à jour" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Default: create user
  const { email, password, fullName, role, groupId } = body;

  if (!email || !password || !fullName) {
    return new Response(JSON.stringify({ error: "Champs obligatoires manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Create user
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Assign role
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: newUser.user.id, role: role || "staff", group_id: groupId || null });

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Update profile
  await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("user_id", newUser.user.id);

  return new Response(JSON.stringify({ message: "Utilisateur créé", userId: newUser.user.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
