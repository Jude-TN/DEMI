import { createClient } from "@/lib/supabase/server";
import Topbar from "@/components/layout/Topbar";

export const dynamic = "force-dynamic";

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

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user!.id).eq("is_active", true).single();
  const bid = bm?.brokerage_id;

  const { data: docs } = await supabase
    .from("documents")
    .select("id,name,file_size_bytes,status,doc_type,uploaded_at,created_at, deal:deals(address)")
    .eq("brokerage_id", bid || "")
    .order("created_at", { ascending: false })
    .limit(25);

  const list: any[] = docs || [];
  const missing = list.filter((d: any) => d.status === "missing");

  return (
    <>
      <Topbar
        title="Documents"
        actions={<button style={{ background: "transparent", border: "1px solid var(--bdr)", color: "var(--text)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 7, cursor: "pointer" }}>{"\u2B06 Upload"}</button>}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        {missing.length > 0 && (
          <div style={{ background: "var(--rose-d)", border: "1px solid var(--rose-b)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            {missing.map((d: any) => (
              <div key={d.id} style={{ fontSize: 12.5, color: "var(--rose)", marginBottom: 4 }}>{"\u26D4 " + (d.deal?.address ? d.deal.address.split(",")[0] + " \u2014 " : "") + d.name}</div>
            ))}
          </div>
        )}

        <div style={{ border: "1.5px dashed var(--bdr)", borderRadius: 12, padding: "38px 20px", textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>{"\uD83D\uDCC4"}</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 5 }}>Drop your contract or documents here</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>{"PDF, DOCX, JPG, PNG \u2014 up to 50MB \u00B7 Multiple files supported"}</div>
          <button style={{ background: "var(--card2)", border: "1px solid var(--bdr)", color: "var(--text)", fontSize: 13, fontWeight: 600, padding: "8px 18px", borderRadius: 8, cursor: "pointer" }}>{"\u2B06 Browse files"}</button>
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 16, fontFamily: "monospace" }}>{"Secure upload \u00B7 SSL encrypted \u00B7 Florida-licensed TCs"}</div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5, fontFamily: "monospace", color: "var(--muted)", marginBottom: 10 }}>RECENT DOCUMENTS</div>
        {list.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "10px 4px" }}>No documents yet. Upload a contract to get started.</div>
        ) : list.map((d: any) => {
          const tag = statusTag(d.status);
          return (
            <div key={d.id} style={{ background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, background: "var(--card2)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{"\uD83D\uDCC4"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "monospace" }}>{fmtBytes(d.file_size_bytes) + (d.deal?.address ? " \u00B7 " + d.deal.address.split(",")[0] : "")}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", background: tag.bg, color: tag.fg, padding: "3px 9px", borderRadius: 5 }}>{tag.label}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
