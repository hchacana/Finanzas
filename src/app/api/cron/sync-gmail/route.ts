import { NextRequest, NextResponse } from "next/server";
import { getGmailClient } from "@/lib/gmail";
import { parseCompraEmail } from "@/lib/parseCompraEmail";
import { appendTransaction, getTransactions, ensureHeaders } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gmail = await getGmailClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const afterEpoch = Math.floor(startOfMonth.getTime() / 1000);

    const res = await gmail.users.messages.list({
      userId: "me",
      q: `from:enviodigital@bancochile.cl subject:Compra after:${afterEpoch}`,
      maxResults: 100,
    });

    const messages = res.data.messages || [];
    const existing = await getTransactions();
    const existingIds = new Set(existing.map((t) => t.id));

    await ensureHeaders();
    let inserted = 0;

    for (const msg of messages) {
      if (existingIds.has(msg.id!)) continue;

      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const payload = full.data.payload;
      let body = "";
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, "base64").toString("utf-8");
      } else if (payload?.parts) {
        const part =
          payload.parts.find((p) => p.mimeType === "text/html") ||
          payload.parts.find((p) => p.mimeType === "text/plain");
        if (part?.body?.data) {
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }

      const parsed = parseCompraEmail(body);
      if (!parsed) continue;

      await appendTransaction({
        fecha: parsed.date.toISOString(),
        monto: parsed.amount,
        comercio: parsed.merchant,
        tarjeta: parsed.cardLast4,
      });
      inserted++;
    }

    return NextResponse.json({ synced: inserted, total_emails: messages.length });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
