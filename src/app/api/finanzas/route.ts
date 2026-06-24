import { NextResponse } from "next/server";
import { getTransactions } from "@/lib/sheets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const now = new Date();
  const month = monthParam ? parseInt(monthParam) : now.getMonth();
  const year = yearParam ? parseInt(yearParam) : now.getFullYear();

  try {
    const transactions = await getTransactions(month, year);
    const total = transactions.reduce((sum, t) => sum + t.monto, 0);
    const monthDate = new Date(year, month, 1);

    return NextResponse.json({
      transactions,
      total,
      month: monthDate.toLocaleDateString("es-CL", {
        month: "long",
        year: "numeric",
      }),
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Error al cargar transacciones" },
      { status: 500 }
    );
  }
}
