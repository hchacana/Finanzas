import { google } from "googleapis";
import { supabase } from "./supabase";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
}

export async function exchangeCode(code: string, userId: string) {
  const { tokens } = await oauth2Client.getToken(code);

  await supabase.from("gmail_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry: tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null,
  });

  return tokens;
}

export async function getGmailClient(userId: string) {
  const { data } = await supabase
    .from("gmail_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) throw new Error("No Gmail tokens found");

  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry ? new Date(data.expiry).getTime() : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    await supabase
      .from("gmail_tokens")
      .update({
        access_token: tokens.access_token,
        expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
      })
      .eq("user_id", userId);
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
