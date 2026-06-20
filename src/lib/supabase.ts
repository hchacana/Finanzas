import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  merchant: string;
  card_last4: string;
  transaction_date: string;
  email_id: string;
  created_at: string;
};
