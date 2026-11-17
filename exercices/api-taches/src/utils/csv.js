const SEPARATOR = ";";
const NEEDS_QUOTES = /[;"\r\n]/;

// Échappe une valeur CSV : guillemets doublés, valeur entourée si besoin.
function escape(value) {
  const text = String(value ?? "");
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export const toCsvLine = (values) => `${values.map(escape).join(SEPARATOR)}\n`;
