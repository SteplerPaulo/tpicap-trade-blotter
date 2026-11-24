const SCALE = 10_000n;
const wholeFormatter = new Intl.NumberFormat("en-US");

/** Convert a validated API price to exact ten-thousandths of a dollar. */
export function priceUnits(price: number): bigint {
  if (
    !Number.isFinite(price) ||
    price < 0.0001 ||
    price > 1_000_000_000 ||
    Number(price.toFixed(4)) !== price
  ) {
    throw new RangeError("Invalid trade price");
  }
  return BigInt(price.toFixed(4).replace(".", ""));
}

export function notionalUnits(quantity: number, price: number): bigint {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000_000) {
    throw new RangeError("Invalid trade quantity");
  }
  return BigInt(quantity) * priceUnits(price);
}

/** Format nonnegative fixed-point amounts with two to four decimal places. */
export function formatMoneyUnits(units: bigint): string {
  if (units < 0n) throw new RangeError("Negative amount");
  const fraction = (units % SCALE)
    .toString()
    .padStart(4, "0")
    .replace(/0+$/, "")
    .padEnd(2, "0");
  return `${wholeFormatter.format(units / SCALE)}.${fraction}`;
}

export const formatPrice = (price: number): string =>
  formatMoneyUnits(priceUnits(price));
export const formatNotional = (quantity: number, price: number): string =>
  formatMoneyUnits(notionalUnits(quantity, price));
