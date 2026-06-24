import { google } from "googleapis";

function getAuth() {
  const credentials = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}"
  );
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SHEET_NAME = "Transacciones";

export type Transaction = {
  id: string;
  fecha: string;
  monto: number;
  comercio: string;
  tarjeta: string;
};

export async function appendTransaction(tx: {
  fecha: string;
  monto: number;
  comercio: string;
  tarjeta: string;
}) {
  const sheets = getSheets();
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:E`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[id, tx.fecha, tx.monto, tx.comercio, tx.tarjeta]],
    },
  });

  return id;
}

export async function getTransactions(month?: number, year?: number): Promise<Transaction[]> {
  const sheets = getSheets();
  const now = new Date();
  const targetMonth = month ?? now.getMonth();
  const targetYear = year ?? now.getFullYear();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:E`,
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) return [];

  return rows
    .slice(1)
    .map((row) => ({
      id: row[0] || "",
      fecha: row[1] || "",
      monto: parseInt(row[2]) || 0,
      comercio: row[3] || "",
      tarjeta: row[4] || "",
    }))
    .filter((tx) => {
      const d = new Date(tx.fecha);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function ensureHeaders() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:E1`,
  });

  if (!res.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:E1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["ID", "Fecha", "Monto", "Comercio", "Tarjeta"]],
      },
    });
  }
}
