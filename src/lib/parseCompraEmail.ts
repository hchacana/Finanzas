export type ParsedTransaction = {
  amount: number;
  merchant: string;
  date: Date;
  cardLast4: string;
};

export function parseCompraEmail(body: string): ParsedTransaction | null {
  try {
    const cleaned = body
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");

    const amountMatch =
      cleaned.match(/\$\s*([\d.,]+)/) ||
      cleaned.match(/monto[:\s]*\$?\s*([\d.,]+)/i) ||
      cleaned.match(/CLP\s*([\d.,]+)/i);

    const merchantMatch =
      cleaned.match(/comercio[:\s]+([A-Za-z0-9\s\-_.]+)/i) ||
      cleaned.match(/en\s+([A-Z][A-Za-z0-9\s\-_.]{2,30})/);

    const cardMatch =
      cleaned.match(/tarjeta[^*\d]*\*+(\d{4})/i) ||
      cleaned.match(/terminada en\s*(\d{4})/i) ||
      cleaned.match(/\*{2,}(\d{4})/);

    const dateMatch =
      cleaned.match(
        /(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{2}):(\d{2})/
      ) ||
      cleaned.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);

    if (!amountMatch) return null;

    const rawAmount = amountMatch[1].replace(/\./g, "").replace(",", ".");
    const amount = Math.round(parseFloat(rawAmount));

    const merchant = merchantMatch
      ? merchantMatch[1].trim().substring(0, 100)
      : "Comercio desconocido";

    const cardLast4 = cardMatch ? cardMatch[1] : "????";

    let date = new Date();
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = parseInt(dateMatch[3]);
      date = new Date(year, month, day);
      if (dateMatch[4] && dateMatch[5]) {
        date.setHours(parseInt(dateMatch[4]), parseInt(dateMatch[5]));
      }
    }

    return { amount, merchant, date, cardLast4 };
  } catch {
    return null;
  }
}
