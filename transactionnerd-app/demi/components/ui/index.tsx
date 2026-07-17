"use client";
import React from "react";
import type { DealStage, TaskPriority, DocStatus, UserRole } from "@/types";

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "ghost" | "danger";
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "sm" | "md";
  loading?: boolean;
}
export function Btn({ variant = "ghost", size = "md", loading, children, style, ...props }: BtnProps) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5,
    borderRadius: 6, fontWeight: 600, cursor: "pointer", border: "none",
    fontFamily: "inherit", transition: "opacity .15s",
    padding: size === "sm" ? "4px 10px" : "7px 14px",
    fontSize: size === "sm" ? 11 : 12,
    opacity: loading ? 0.6 : 1,
  };
  const variants: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: "var(--teal)", color: "#0a1412" },
    ghost:   { background: "transparent", color: "var(--muted)", border: "1px solid var(--bdrs)" },
    danger:  { background: "var(--rose-d)", color: "var(--rose)", border: "1px solid var(--rose-b)" },
  };
  return (
    <button disabled={loading || props.disabled} style={{ ...base, ...variants[variant], ...style }} {...props}>
      {loading ? <Spinner size={12} /> : null}
      {children}
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid rgba(255,255,255,0.15)`,
      borderTopColor: "var(--teal)", borderRadius: "50%",
      animation: "demi-spin 0.7s linear infinite",
    }} />
  );
}

// ─── Tag ──────────────────────────────────────────────────────────────────────
type TagColor = "teal" | "amber" | "rose" | "blue" | "muted" | "purple";
interface TagProps { label: string; color?: TagColor; size?: number; }
const TAG_COLORS: Record<TagColor, [string, string]> = {
  teal:   ["var(--teal-d)", "var(--teal)"],
  amber:  ["var(--amber-d)", "var(--amber)"],
  rose:   ["var(--rose-d)", "var(--rose)"],
  blue:   ["var(--blue-d)", "var(--blue)"],
  muted:  ["rgba(255,255,255,0.05)", "var(--muted)"],
  purple: ["rgba(83,74,183,0.15)", "#AFA9EC"],
};
export function Tag({ label, color = "teal", size = 9 }: TagProps) {
  const [bg, fg] = TAG_COLORS[color];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: size, fontWeight: 700, fontFamily: "monospace",
      letterSpacing: 0.3, background: bg, color: fg,
      padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ─── Stage tag ────────────────────────────────────────────────────────────────
const STAGE_MAP: Record<DealStage, [string, TagColor]> = {
  lead:            ["Lead",             "muted"],
  listing:         ["Listing",          "blue"],
  under_contract:  ["Under Contract",   "teal"],
  clear_to_close:  ["Clear to Close",   "amber"],
  closed:          ["Closed",           "teal"],
  cancelled:       ["Cancelled",        "rose"],
};
export function StageTag({ stage }: { stage: DealStage }) {
  const [label, color] = STAGE_MAP[stage];
  return <Tag label={label} color={color} />;
}

// ─── Priority tag ─────────────────────────────────────────────────────────────
const PRI_MAP: Record<TaskPriority, TagColor> = { high: "rose", medium: "amber", low: "muted" };
export function PriorityTag({ priority }: { priority: TaskPriority }) {
  return <Tag label={priority.toUpperCase()} color={PRI_MAP[priority]} />;
}

// ─── Doc status tag ───────────────────────────────────────────────────────────
const DOC_MAP: Record<DocStatus, TagColor> = { missing: "rose", received: "teal", executed: "teal", waived: "muted" };
export function DocStatusTag({ status }: { status: DocStatus }) {
  return <Tag label={status.charAt(0).toUpperCase() + status.slice(1)} color={DOC_MAP[status]} />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AV_COLORS: Record<string, [string, string]> = {
  CR: ["var(--teal-d)", "var(--teal)"],
  AM: ["var(--amber-d)", "var(--amber)"],
  JP: ["var(--teal-d)", "var(--teal)"],
};
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}
interface AvatarProps { name: string; size?: number; url?: string | null; }
export function Avatar({ name, size = 28, url }: AvatarProps) {
  const initials = getInitials(name);
  const [bg, fg] = AV_COLORS[initials] ?? ["rgba(46,191,165,0.13)", "var(--teal)"];
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, border: `1.5px solid ${fg}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: fg,
      fontFamily: "monospace", flexShrink: 0,
    }}>{initials}</div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ pct, height = 4, color = "var(--teal)" }: { pct: number; height?: number; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 3, height, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, height, background: color, borderRadius: 3, transition: "width .3s" }} />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, subColor = "var(--teal)" }: { label: string; value: string | number; sub?: string; subColor?: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "10px 13px" }}>
      <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: "var(--text)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: subColor, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--muted)", fontFamily: "monospace", marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon = "📭", title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 480 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--panel)", border: "1px solid var(--bdrs)", borderRadius: 12, width, maxWidth: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--bdr)" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
export function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: 0.2 }}>
        {label}{required && <span style={{ color: "var(--rose)", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<UserRole, TagColor> = { admin: "rose", tc: "teal", agent: "blue" };
const ROLE_LABELS: Record<UserRole, string> = { admin: "Admin", tc: "TC", agent: "Agent" };
export function RoleBadge({ role }: { role: UserRole }) {
  return <Tag label={ROLE_LABELS[role]} color={ROLE_COLORS[role]} />;
}

// ─── Inject keyframes once ────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const id = "demi-global-style";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `@keyframes demi-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(s);
  }
}
