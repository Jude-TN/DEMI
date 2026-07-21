import { createClient } from "@/lib/supabase/server";
import CalendarClient, { CalEvent } from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user!.id).eq("is_active", true).single();
  const bid = bm?.brokerage_id;

  const { data: deals } = await supabase
    .from("deals")
    .select("id,address,close_date,inspection_period_end,walk_through_date,emd_due_date")
    .eq("brokerage_id", bid || "")
    .is("archived_at", null);

  const events: CalEvent[] = [];
  (deals || []).forEach((d: any) => {
    const short = (d.address || "").split(",")[0];
    if (d.close_date) events.push({ date: d.close_date, label: "Close \u2014 " + short, kind: "close" });
    if (d.inspection_period_end) events.push({ date: d.inspection_period_end, label: "Inspection \u2014 " + short, kind: "inspection" });
    if (d.walk_through_date) events.push({ date: d.walk_through_date, label: "Walkthrough \u2014 " + short, kind: "key" });
    if (d.emd_due_date) events.push({ date: d.emd_due_date, label: "EMD due \u2014 " + short, kind: "key" });
  });

  return <CalendarClient events={events} />;
}
