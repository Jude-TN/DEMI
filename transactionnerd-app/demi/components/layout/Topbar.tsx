"use client";
import React from "react";
import { Btn } from "@/components/ui";

interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
  search?: { placeholder: string; value: string; onChange: (v: string) => void };
}

export default function Topbar({ title, actions, search }: TopbarProps) {
  return (
    <div style={{
      height: 48, minHeight: 48, display: "flex", alignItems: "center",
      padding: "0 16px", gap: 10, borderBottom: "1px solid var(--bdr)",
      background: "var(--bg)", position: "sticky", top: 0, zIndex: 10,
    }}>
      <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{title}</span>
      {search && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 6, padding: "4px 9px", minWidth: 180 }}>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>🔍</span>
          <input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: "var(--text)", width: "100%" }}
          />
        </div>
      )}
      {actions}
    </div>
  );
}
