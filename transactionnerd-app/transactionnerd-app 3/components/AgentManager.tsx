"use client";

import { useState } from "react";

interface AgentOption {
  id: string;
  full_name: string;
  email: string;
}

export default function AgentManager({
  transactionId,
  linkedAgents: initialLinked,
  allAgents,
}: {
  transactionId: string;
  linkedAgents: AgentOption[];
  allAgents: AgentOption[];
}) {
  const [linked, setLinked] = useState(initialLinked);
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const linkedIds = new Set(linked.map((a) => a.id));
  const available = allAgents.filter((a) => !linkedIds.has(a.id));

  const addAgent = async (agent: AgentOption) => {
    setBusy(true);
    const res = await fetch("/api/transaction-agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: transactionId, agent_id: agent.id }),
    });
    if (res.ok) setLinked((prev) => [...prev, agent]);
    setBusy(false);
    setShowPicker(false);
  };

  const removeAgent = async (agent: AgentOption) => {
    setBusy(true);
    const res = await fetch("/api/transaction-agents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: transactionId, agent_id: agent.id }),
    });
    if (res.ok) setLinked((prev) => prev.filter((a) => a.id !== agent.id));
    setBusy(false);
  };

  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[11px] font-medium text-charcoal">Agents on this deal</div>
        <button
          onClick={() => setShowPicker((s) => !s)}
          className="text-[9.5px] font-medium bg-teal/10 text-teal-dark px-2.5 py-1.5 rounded-md"
        >
          + Add agent
        </button>
      </div>

      <div className="space-y-1.5 mb-2">
        {linked.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between bg-off rounded-md px-2.5 py-1.5">
            <div>
              <div className="text-[11px] text-charcoal">{agent.full_name}</div>
              <div className="text-[9px] text-charcoal/50">{agent.email}</div>
            </div>
            <button
              onClick={() => removeAgent(agent)}
              disabled={busy}
              className="text-[9px] text-charcoal/40 hover:text-red-500"
            >
              Remove
            </button>
          </div>
        ))}
        {linked.length === 0 && <div className="text-[10px] text-charcoal/50">No agents linked yet.</div>}
      </div>

      {showPicker && (
        <div className="border-t border-line pt-2.5 space-y-1">
          {available.map((agent) => (
            <button
              key={agent.id}
              onClick={() => addAgent(agent)}
              disabled={busy}
              className="w-full text-left text-[10.5px] text-charcoal px-2.5 py-1.5 rounded-md hover:bg-off"
            >
              {agent.full_name} <span className="text-charcoal/40">({agent.email})</span>
            </button>
          ))}
          {available.length === 0 && (
            <div className="text-[10px] text-charcoal/40 px-2.5">Every agent is already linked to this deal.</div>
          )}
        </div>
      )}
    </div>
  );
}
