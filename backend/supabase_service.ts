import { createClient } from "@supabase/supabase-js";

const supabaseUrl            = process.env.SUPABASE_URL            ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl) {
  console.error("❌ SUPABASE_URL is not set. Add it to your environment variables.");
  process.exit(1);
}
if (!supabaseServiceRoleKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your environment variables.");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
