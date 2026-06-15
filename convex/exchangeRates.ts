import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Fetch the current exchange rate from `currency` to BRL using a free, no-key
 * public API (open.er-api.com). Runs server-side (Convex action) to avoid CORS
 * and keep the data source swappable.
 *
 * Returns `{ rate, date }`. `rate` is null when it cannot be resolved (the UI
 * then falls back to manual entry). For BRL -> BRL the rate is 1.
 */
export const getRateToBRL = action({
  args: { currency: v.string() },
  handler: async (
    _ctx,
    { currency }
  ): Promise<{ rate: number | null; date: string | null }> => {
    const cur = currency.trim().toUpperCase();
    if (!cur) return { rate: null, date: null };
    if (cur === "BRL") return { rate: 1, date: null };

    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${cur}`);
      if (!res.ok) return { rate: null, date: null };
      const data = (await res.json()) as {
        result?: string;
        rates?: Record<string, number>;
        time_last_update_utc?: string;
      };
      if (data.result !== "success" || !data.rates) {
        return { rate: null, date: null };
      }
      const raw = data.rates.BRL;
      const rate =
        typeof raw === "number" && isFinite(raw) ? Number(raw.toFixed(4)) : null;
      return { rate, date: data.time_last_update_utc ?? null };
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);
      return { rate: null, date: null };
    }
  },
});
