import { CURRENCIES } from "@/lib/countries-currencies";

export interface DisplayMarket {
  currency: string;
  conversionRate: string;
}

/**
 * Converts a base-currency price to a market's display currency using the
 * market's merchant-entered fixed rate (no live FX). Display-only — checkout
 * always totals in the merchant's base currency regardless of the market shown.
 */
export function convertAndFormatPrice(
  basePrice: number,
  baseCurrency: string,
  market: DisplayMarket | null,
): string {
  const targetCurrency = market?.currency || baseCurrency;
  const rate = market ? parseFloat(market.conversionRate) : 1;
  const converted = basePrice * (isNaN(rate) ? 1 : rate);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: targetCurrency }).format(converted);
  } catch {
    const symbol = CURRENCIES.find((c) => c.code === targetCurrency)?.symbol || targetCurrency;
    return `${symbol}${converted.toFixed(2)}`;
  }
}
