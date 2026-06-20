import { NextResponse } from "next/server";
import { getGmailClient } from "@/lib/gmail";
import { parseCompraEmail } from "@/lib/parseCompraEmail";
import { supabase } from "@/lib/supabase";

export async function POST() {
  try {
    const userId = "default";
    const gmail = await getGmailClient(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const afterEpoch = Math.floor(startOfMonth.getTime() / 1000);

    const res = await gmail.users.messages.list({
      userId: "me",
      q: `from:enviodigital@bancochile.cl subject:Compra after:${afterEpoch}`,
      maxResults: 100,
    });

    const messages = res.data.messages || [];
    let inserted = 0;

    for (const msg of messages) {
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
        const htmlPart = payload.parts.find(
          (p) => p.mimeType === "text/html"
        );
        const textPart = payload.parts.find(
          (p) => p.mimeType === "text/plain"
        );
        const part = htmlPart || textPart;
        if (part?.body?.data) {
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }

      const parsed = parseCompraEmail(body);
      if (!parsed) continue;

      const { error } = await supabase.from("transactions").upsert(
        {
          user_id: userId,
          amount: parsed.amount,
          merchant: parsed.merchant,
          card_last4: parsed.cardLast4,
          transaction_date: parsed.date.toISOString(),
          email_id: msg.id!,
        },
        { onConflict: "email_id" }
      );

      if (!error) inserted++;
    }

    return NextResponse.json({
      synced: inserted,
      total_emails: messages.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
