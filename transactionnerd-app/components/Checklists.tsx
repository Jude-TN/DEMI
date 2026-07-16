"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Checklist, ChecklistItem, ChecklistTemplate } from "@/lib/types";

export default function Checklists({
  transactionId,
  checklists: initialChecklists,
  templates,
  editable,
}: {
  transactionId: string;
  checklists: Checklist[];
  templates: ChecklistTemplate[];
  editable: boolean;
}) {
  const [checklists, setChecklists] = useState(initialChecklists);
  const [showAdd, setShowAdd] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customItems, setCustomItems] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const toggleItem = async (item: ChecklistItem) => {
    if (!editable) return;
    setChecklists((prev) =>
      prev.map((c) =>
        c.id !== item.checklist_id
          ? c
          : { ...c, items: c.items?.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)) }
      )
    );
    await supabase.from("checklist_items").update({ done: !item.done }).eq("id", item.id);
  };

  const addFromTemplate = async (templateId: string) => {
    setSaving(true);
    const res = await fetch("/api/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: transactionId, template_id: templateId }),
    });
    const { checklist } = await res.json();
    const { data: items } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("checklist_id", checklist.id)
      .order("position");
    setChecklists((prev) => [...prev, { ...checklist, items: items || [] }]);
    setSaving(false);
    setShowAdd(false);
  };

  const addCustom = async (saveAsTemplate: boolean) => {
    if (!customTitle.trim()) return;
    setSaving(true);
    const items = customItems.map((i) => i.trim()).filter(Boolean);
    const res = await fetch("/api/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: transactionId, title: customTitle.trim(), items }),
    });
    const { checklist } = await res.json();

    if (saveAsTemplate) {
      await fetch("/api/checklist-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist_id: checklist.id, title: customTitle.trim() }),
      });
    }

    const { data: savedItems } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("checklist_id", checklist.id)
      .order("position");
    setChecklists((prev) => [...prev, { ...checklist, items: savedItems || [] }]);
    setCustomTitle("");
    setCustomItems([""]);
    setSaving(false);
    setShowAdd(false);
  };

  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-medium text-charcoal">Checklists</div>
        {editable && (
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="text-[9.5px] font-medium bg-teal/10 text-teal-dark px-2.5 py-1.5 rounded-md"
          >
            + Add checklist
          </button>
        )}
      </div>

      <div className="space-y-3 mb-3">
        {checklists.map((c) => {
          const items = c.items || [];
          const done = items.filter((i) => i.done).length;
          return (
            <div key={c.id} className="bg-off border border-line rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10.5px] font-medium text-charcoal">
                  {c.title} {c.is_custom && <span className="text-teal font-mono text-[8.5px] font-normal">custom</span>}
                </span>
                <span className="text-[9px] text-charcoal/50">{done}/{items.length}</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1">
                  <button
                    onClick={() => toggleItem(item)}
                    disabled={!editable}
                    className={`w-3 h-3 rounded-sm border flex-shrink-0 ${item.done ? "bg-teal border-teal" : "border-charcoal/30"}`}
                  />
                  <span className={`text-[10px] ${item.done ? "line-through text-charcoal/40" : "text-charcoal"}`}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
        {checklists.length === 0 && <div className="text-[10px] text-charcoal/50">No checklists yet.</div>}
      </div>

      {showAdd && (
        <div className="border-t border-line pt-3">
          <div className="text-[9px] uppercase tracking-wide text-charcoal/50 mb-1.5">From template</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => addFromTemplate(t.id)}
                disabled={saving}
                className="text-[9.5px] border border-line rounded-md px-2.5 py-1.5 text-charcoal hover:border-teal/50"
              >
                {t.title}
              </button>
            ))}
            {templates.length === 0 && <span className="text-[9.5px] text-charcoal/40">No saved templates yet</span>}
          </div>

          <div className="text-[9px] uppercase tracking-wide text-charcoal/50 mb-1.5">Or build custom</div>
          <input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Checklist name..."
            className="w-full text-[10.5px] border border-line rounded-md px-2.5 py-1.5 mb-1.5 bg-white"
          />
          {customItems.map((item, i) => (
            <input
              key={i}
              value={item}
              onChange={(e) => {
                const next = [...customItems];
                next[i] = e.target.value;
                setCustomItems(next);
              }}
              placeholder={`Item ${i + 1}...`}
              className="w-full text-[10px] border border-line rounded-md px-2.5 py-1.5 mb-1.5 bg-white"
            />
          ))}
          <button
            onClick={() => setCustomItems((prev) => [...prev, ""])}
            className="text-[9.5px] text-teal mb-2"
          >
            + Add another item
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => addCustom(true)}
              disabled={saving || !customTitle.trim()}
              className="text-[9.5px] font-medium bg-teal text-white px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              Save as template & add
            </button>
            <button
              onClick={() => addCustom(false)}
              disabled={saving || !customTitle.trim()}
              className="text-[9.5px] border border-line text-charcoal px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              Just add to this deal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
