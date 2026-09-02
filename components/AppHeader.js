import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import TopbarClient from "./TopbarClient";

export default async function AppHeader() {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);

  if (!user) return null;

  const nombre = (profile?.full_name || user.email).split(" ")[0];

  return <TopbarClient nombre={nombre} isAdmin={!!profile?.is_admin} />;
}
