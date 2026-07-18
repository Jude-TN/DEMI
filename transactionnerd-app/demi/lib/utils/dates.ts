import { format, parseISO, differenceInDays, startOfDay, startOfYear, subDays } from "date-fns";

export const todayISO  = () => new Date().toISOString().split("T")[0];
export const in7ISO    = () => new Date(Date.now() + 7*86400000).toISOString().split("T")[0];
export const in3ISO    = () => new Date(Date.now() + 3*86400000).toISOString().split("T")[0];
export const ago30ISO  = () => new Date(Date.now() - 30*86400000).toISOString();
export const ytdISO    = () => startOfYear(new Date()).toISOString();

export function formatDate(d: string | null | undefined, fmt = "MMM d, yyyy"): string {
  if (!d) return "—";
  try { return format(parseISO(d), fmt); } catch { return d; }
}

export function formatShort(d: string | null | undefined): string {
  return formatDate(d, "MMM d");
}

export function daysUntil(d: string | null | undefined): number {
  if (!d) return 999;
  try { return differenceInDays(startOfDay(parseISO(d)), startOfDay(new Date())); } catch { return 999; }
}

export function isOverdue(d: string | null | undefined): boolean {
  return !!(d && daysUntil(d) < 0);
}
export function isDueToday(d: string | null | undefined): boolean {
  return daysUntil(d) === 0;
}
