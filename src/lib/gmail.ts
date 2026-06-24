import { google } from "googleapis";

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

export async function exchangeCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);

  const sheets = google.sheets({
    version: "v4",
    auth: new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }),
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: "Tokens!A1:C1",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        tokens.access_token || "",
        tokens.refresh_token || "",
        tokens.expiry_date?.toString() || "",
      ]],
    },
  });

  return tokens;
}

export async function getGmailClient() {
  const sheets = google.sheets({
    version: "v4",
    auth: new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }),
  });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: "Tokens!A1:C1",
  });

  const row = res.data.values?.[0];
  if (!row?.[0]) throw new Error("No Gmail tokens found. Conecta tu Gmail primero.");

  oauth2Client.setCredentials({
    access_token: row[0],
    refresh_token: row[1],
    expiry_date: row[2] ? parseInt(row[2]) : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    const currentRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: "Tokens!A1:C1",
    });
    const current = currentRes.data.values?.[0] || ["", "", ""];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: "Tokens!A1:C1",
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          tokens.access_token || current[0],
          tokens.refresh_token || current[1],
          tokens.expiry_date?.toString() || current[2],
        ]],
      },
    });
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
