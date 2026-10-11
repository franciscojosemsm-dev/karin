import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Cliente con service_role: solo para el cron. Salta RLS, no exponer jamás al navegador. */
export const createAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
