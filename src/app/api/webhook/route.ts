import { NextRequest, NextResponse } from "next/server";
import { appendTransaction, ensureHeaders } from "@/lib/sheets";
import { parseCompraEmail } from "@/lib/parseCompraEmail";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    await ensureHeaders();

    if (body.email_body) {
      const parsed = parseCompraEmail(body.email_body);
      if (!parsed) {
        return NextResponse.json(
          { error: "No se pudo parsear el email" },
          { status: 400 }
        );
      }
      const id = await appendTransaction({
        fecha: parsed.date.toISOString(),
        monto: parsed.amount,
        comercio: parsed.merchant,
        tarjeta: parsed.cardLast4,
      });
      return NextResponse.json({ success: true, id, parsed });
    }

    const { fecha, monto, comercio, tarjeta } = body;
    if (!monto || !comercio) {
      return NextResponse.json(
        { error: "Se requiere al menos monto y comercio" },
        { status: 400 }
      );
    }

    const id = await appendTransaction({
      fecha: fecha || new Date().toISOString(),
      monto: Math.round(Number(monto)),
      comercio: String(comercio).trim(),
      tarjeta: tarjeta || "****",
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Error procesando webhook" },
      { status: 500 }
    );
  }
}
