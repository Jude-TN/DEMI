"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";

export default function TaskList({
  tasks: initialTasks,
  editable,
}: {
  tasks: Task[];
  editable: boolean;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  const toggle = (task: Task) => {
    if (!editable) return;
    const next = tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t));
    setTasks(next);
    startTransition(async () => {
      await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
    });
  };

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div>
      <div className="text-[11px] font-medium text-charcoal mb-2">
        Tasks &middot; {doneCount} of {tasks.length}
      </div>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2 py-1.5 border-b border-line/70 last:border-none">
            <button
              onClick={() => toggle(task)}
              disabled={!editable || isPending}
              aria-label={task.done ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
              className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 ${
                task.done ? "bg-teal border-teal" : "border-charcoal/30"
              } ${editable ? "cursor-pointer" : "cursor-default"}`}
            />
            <span className={`text-[11px] ${task.done ? "line-through text-charcoal/40" : "text-charcoal"}`}>
              {task.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
