"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Topbar from "@/components/layout/Topbar";

function statusTag(s: string) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    executed: { bg: "var(--teal-d)", fg: "var(--teal)", label: "Parsed" },
    received: { bg: "var(--teal-d)", fg: "var(--teal)", label: "Received" },
    missing: { bg: "rgba(234,179,8,.15)", fg: "#eab308", label: "Incomplete" },
    waived: { bg: "rgba(148,163,184,.15)", fg: "var(--muted)", label: "Waived" },
  };
  return map[s] || map.received;
}

function fmtBytes(b: number | null) {
  if (!b) return "";
  if (b > 1e6) return (b / 1e6).toFixed(1) + " MB";
  return Math.round(b / 1e3) + " KB";
}

export default function DocumentsPage() {
  const supabase = createClient();
  const [docs, setDocs] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [dealId, setDealId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDeals = useCallback(async () => {
    const { data } = await supabase
      .from("deals")
      .select("id,address,city,mls_number,brokerage_id")
      .order("created_at", { ascending: false });
    const list = data ?? [];
    setDeals(list);
    if (list.length && !dealId) setDealId(list[0].id);
  }, [supabase, dealId]);

  const loadDocs = useCallback(async () => {
    const { data } = await supabase
      .from("documents")
      .select("id,name,file_size_bytes,status,doc_type,uploaded_at,created_at,deal:deals(address)")
      .order("created_at", { ascending: false })
      .limit(25);
    setDocs(data ?? []);
  }, [supabase]);

  useEffect(() => { loadDeals(); loadDocs(); }, [loadDeals, loadDocs]);

  async function uploadFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const deal = deals.find((x) => x.id === dealId);
    if (!deal) { setErr("Pick a deal first."); return; }
    setErr("");
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    for (const file of Array.from(files)) {
      const path = `${deal.brokerage_id}/${deal.id}/${Date.now()}_${file.name}`;
      const up = await supabase.storage.from("deal-documents").upload(path, file);
      if (up.error) { setErr(up.error.message); continue; }
      const ins = await supabase.from("documents").insert({
        deal_id: deal.id,
        brokerage_id: deal.brokerage_id,
        name: file.name,
        file_url: path,
        file_size_bytes: file.size,
        doc_type: "other",
        status: "received",
        uploaded_by: user?.id ?? null,
        uploaded_at: new Date().toISOString(),
      });
      if (ins.error) { setErr(ins.error.message); continue; }
      try {
        await fetch(`/api/deals/${deal.id}/timeline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_type: "document_uploaded", description: "Document uploaded: " + file.name }),
        });
      } catch {}
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    loadDocs();
  }

  return (
    <>
      <Topbar
        title="Documents"
        actions={
          <button
            onClick={() => fileRef.current?.click()}
            style={{ background: "transparent", border: "1px solid var(--bdr)", color: "var(--text)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
          >
            ⬆ Upload
          </button>
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => uploadFiles(e.target.files)}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Deal</span>
          <select
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
            style={{ background: "var(--panel)", border: "1px solid var(--bdr)", color: "var(--text)", borderRadius: 8, padding: "8px 10px", fontSize: 13, minWidth: 260 }}
          >
            {deals.length === 0 && <option value="">No deals</option>}
            {deals.map((dl) => (
              <option key={dl.id} value={dl.id}>
                {dl.address}{dl.city ? ", " + dl.city : ""}{dl.mls_number ? " (" + dl.mls_number + ")" : ""}
              </option>
            ))}
          </select>
        </div>

        {err && (
          <div style={{ background: "var(--rose-d)", border: "1px solid var(--rose-b)", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13, color: "var(--rose)" }}>
            {err}
          </div>
        )}

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}
          style={{ border: "1px dashed var(--bdr)", borderRadius: 12, padding: 40, textAlign: "center", marginBottom: 24 }}
        >
          <div style={{ fontSize: 34, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Drop your contract or documents here</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>PDF, DOCX, JPG, PNG — up to 50MB · Multiple files supported</div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ marginTop: 16, background: "var(--panel)", border: "1px solid var(--bdr)", color: "var(--text)", borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer" }}
          >
            {uploading ? "Uploading…" : "⬆ Browse files"}
          </button>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>Secure upload · SSL encrypted · Florida-licensed TCs</div>
        </div>

        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>Recent Documents</div>
        {docs.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>No documents yet. Upload a contract to get started.</div>
        ) : (
          docs.map((doc) => {
            const st = statusTag(doc.status);
            return (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{doc.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {fmtBytes(doc.file_size_bytes)}{doc.deal?.address ? " · " + doc.deal.address : ""}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: st.bg, color: st.fg, padding: "4px 10px", borderRadius: 20 }}>{st.label}</span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
