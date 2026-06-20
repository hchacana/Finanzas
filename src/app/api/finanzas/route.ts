import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("transaction_date", startOfMonth.toISOString())
    .lte("transaction_date", endOfMonth.toISOString())
    .order("transaction_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = (data || []).reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({
    transactions: data || [],
    total,
    month: now.toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
  });
}
