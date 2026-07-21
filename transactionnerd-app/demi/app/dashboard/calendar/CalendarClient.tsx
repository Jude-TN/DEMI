"use client";
import { useState } from "react";

export interface CalEvent { date: string; label: string; kind: "close" | "inspection" | "key"; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function kindColor(k: string) {
  if (k === "inspection") return "#eab308";
  if (k === "key") return "var(--rose)";
  return "var(--teal)";
}

export default function CalendarClient({ events }: { events: CalEvent[] }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const todayStr = now.toISOString().slice(0, 10);

  const first = new Date(ym.y, ym.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: Date[] = [];
  const prevDays = new Date(ym.y, ym.m, 0).getDate();
  for (let i = 0; i < startDow; i++) cells.push(new Date(ym.y, ym.m - 1, prevDays - startDow + 1 + i));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(ym.y, ym.m, d));
  while (cells.length % 7 !== 0) cells.push(new Date(ym.y, ym.m + 1, cells.length - startDow - daysInMonth + 1));

  function eventsFor(d: Date) {
    const iso = d.toISOString().slice(0, 10);
    return events.filter((e) => e.date === iso);
  }
  function nav(delta: number) {
    let m = ym.m + delta, y = ym.y;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setYm({ y, m });
  }

  const btn = { background: "transparent", border: "1px solid var(--bdr)", color: "var(--text)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 7, cursor: "pointer" };

  return (
    <>
      <div style={{ height: 48, minHeight: 48, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, borderBottom: "1px solid var(--bdr)", background: "var(--bg)", position: "sticky", top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Calendar</span>
        <button style={btn} onClick={() => nav(-1)}>{"\u2190 Prev"}</button>
        <button style={btn} onClick={() => nav(1)}>{"Next \u2192"}</button>
        <button style={{ ...btn }}>+ Add event</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{MONTHS[ym.m]} {ym.y}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {DOW.map((d) => (
              <div key={d} style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace", padding: "0 4px 6px", textAlign: "center" }}>{d}</div>
            ))}
            {cells.map((d, i) => {
              const iso = d.toISOString().slice(0, 10);
              const inMonth = d.getMonth() === ym.m;
              const isToday = iso === todayStr;
              const evs = inMonth ? eventsFor(d) : [];
              return (
                <div key={i} style={{ minHeight: 92, border: "1px solid var(--bdr)", borderRadius: 8, padding: 7, background: isToday ? "var(--teal-d)" : "var(--bg)", opacity: inMonth ? 1 : .35 }}>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? "var(--teal)" : "var(--muted)", marginBottom: 4 }}>{d.getDate()}</div>
                  {isToday && <div style={{ fontSize: 9, fontWeight: 700, background: "var(--teal)", color: "#0a1412", borderRadius: 4, padding: "1px 6px", display: "inline-block", marginBottom: 4 }}>Today</div>}
                  {evs.map((e, j) => (
                    <div key={j} style={{ fontSize: 10.5, fontWeight: 600, color: kindColor(e.kind), marginBottom: 3, lineHeight: 1.25 }}>{e.label}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
