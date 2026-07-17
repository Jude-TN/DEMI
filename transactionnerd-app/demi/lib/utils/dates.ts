import { format, parseISO, differenceInDays, isAfter, isBefore, startOfDay } from "date-fns";

export function formatDate(date: string | null | undefined, fmt = "MMM d, yyyy"): string {
  if (!date) return "—";
  try { return format(parseISO(date), fmt); } catch { return date; }
}

export function formatDateShort(date: string | null | undefined): string {
  return formatDate(date, "MMM d");
}

export function daysUntil(date: string | null | undefined): number {
  if (!date) return 999;
  try {
    return differenceInDays(startOfDay(parseISO(date)), startOfDay(new Date()));
  } catch { return 999; }
}

export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false;
  try { return isBefore(parseISO(date), startOfDay(new Date())); } catch { return false; }
}

export function isDueToday(date: string | null | undefined): boolean {
  if (!date) return false;
  return daysUntil(date) === 0;
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function in7DaysISO(): string {
  return new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
}

export function in30DaysISO(): string {
  return new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
}

export function ago30DaysISO(): string {
  return new Date(Date.now() - 30 * 86400000).toISOString();
}
