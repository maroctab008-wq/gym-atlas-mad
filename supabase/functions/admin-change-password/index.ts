import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const { data: { user: caller } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!caller) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  // Check admin role
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", caller.id).limit(1).single();
  if (!roleData || roleData.role !== "admin") {
    return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const { userId, newPassword } = await req.json();

  if (!userId || !newPassword) {
    return new Response(JSON.stringify({ error: "Champs obligatoires manquants" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (newPassword.length < 6) {
    return new Response(JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ message: "Mot de passe modifié avec succès" }), {
    headers: { "Content-Type": "application/json" },
  });
});