/** Money is stored in minor units (paise). Format at the edge only. */
export function formatMoney(minor: number, currency = "INR", locale = "en-IN") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}
