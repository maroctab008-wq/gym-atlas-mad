import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const admins = [
    { email: "admin@admin.com", name: "Administrateur", role: "admin" as const, password: "12345" },
    { email: "remote-admin@admin.com", name: "Remote Admin", role: "admin" as const, password: "12345@@?" },
  ];

  const results = [];

  for (const admin of admins) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === admin.email);

    if (existing) {
      // Update password for existing user
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, { password: admin.password });
      if (updateErr) {
        results.push({ email: admin.email, status: "password update error", error: updateErr.message });
      } else {
        results.push({ email: admin.email, status: "password updated" });
      }
      continue;
    }

    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: { full_name: admin.name },
    });

    if (error) {
      results.push({ email: admin.email, status: "error", error: error.message });
      continue;
    }

    await supabase.from("user_roles").insert({ user_id: newUser.user.id, role: admin.role });
    await supabase.from("profiles").update({ full_name: admin.name }).eq("user_id", newUser.user.id);

    results.push({ email: admin.email, status: "created", userId: newUser.user.id });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
