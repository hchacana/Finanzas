import { NextRequest, NextResponse } from "next/server";
import { getGmailClient } from "@/lib/gmail";
import { parseCompraEmail } from "@/lib/parseCompraEmail";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tokenRows } = await supabase
    .from("gmail_tokens")
    .select("user_id");

  if (!tokenRows?.length) {
    return NextResponse.json({ message: "No users to sync" });
  }

  const results = [];

  for (const row of tokenRows) {
    try {
      const gmail = await getGmailClient(row.user_id);
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
          const part =
            payload.parts.find((p) => p.mimeType === "text/html") ||
            payload.parts.find((p) => p.mimeType === "text/plain");
          if (part?.body?.data) {
            body = Buffer.from(part.body.data, "base64").toString("utf-8");
          }
        }

        const parsed = parseCompraEmail(body);
        if (!parsed) continue;

        const { error } = await supabase.from("transactions").upsert(
          {
            user_id: row.user_id,
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

      results.push({ user: row.user_id, synced: inserted });
    } catch (error) {
      results.push({
        user: row.user_id,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }

  return NextResponse.json({ results });
}
