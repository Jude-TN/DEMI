// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "agent" | "tc";

export type DealStage =
  | "lead"
  | "listing"
  | "under_contract"
  | "clear_to_close"
  | "closed"
  | "cancelled";

export type DealSide = "buyer" | "seller" | "dual";

export type TaskStatus = "open" | "completed" | "waived";
export type TaskPriority = "high" | "medium" | "low";

export type DocStatus = "missing" | "received" | "executed" | "waived";
export type DocType =
  | "purchase_agreement"
  | "listing_agreement"
  | "seller_disclosure"
  | "hoa_estoppel"
  | "hoa_docs"
  | "title_commitment"
  | "commitment_letter"
  | "appraisal"
  | "inspection_report"
  | "closing_disclosure"
  | "survey"
  | "addendum"
  | "other";

export type ContactRole =
  | "buyer"
  | "seller"
  | "buyer_agent"
  | "seller_agent"
  | "title"
  | "lender"
  | "inspector"
  | "appraiser"
  | "hoa"
  | "attorney"
  | "other";

export type NotifChannel = "in_app" | "email" | "both";

// ─── Database row types ───────────────────────────────────────────────────────

export interface Brokerage {
  id: string;
  name: string;
  team_name: string | null;
  license_number: string | null;
  primary_market: string | null;
  logo_url: string | null;
  timezone: string;
  default_tc_id: string | null;
  created_at: string;
}

export interface User {
  id: string;
  brokerage_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  license_number: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  brokerage_id: string;
  address: string;
  unit: string | null;
  city: string;
  state: string;
  zip: string;
  sale_price: number | null;
  close_date: string | null;
  effective_date: string | null;
  side: DealSide;
  stage: DealStage;
  agent_id: string | null;
  tc_id: string | null;
  mls_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  // joined
  agent?: User;
  tc?: User;
  _task_count?: number;
  _completed_task_count?: number;
}

export interface Task {
  id: string;
  deal_id: string;
  brokerage_id: string;
  label: string;
  assignee_id: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  completed_at: string | null;
  template_step_id: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  // joined
  assignee?: User;
}

export interface Document {
  id: string;
  deal_id: string;
  brokerage_id: string;
  name: string;
  file_url: string | null;
  file_size_bytes: number | null;
  doc_type: DocType;
  status: DocStatus;
  uploaded_by: string | null;
  uploaded_at: string | null;
  notes: string | null;
  created_at: string;
  // joined
  uploader?: User;
}

export interface Contact {
  id: string;
  deal_id: string;
  brokerage_id: string;
  role: ContactRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  fub_contact_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  deal_id: string;
  brokerage_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
  // joined
  sender?: User;
}

export interface TimelineEvent {
  id: string;
  deal_id: string;
  brokerage_id: string;
  event_type: string;
  description: string;
  user_id: string | null;
  created_at: string;
  // joined
  user?: User;
}

export interface ChecklistTemplate {
  id: string;
  brokerage_id: string;
  name: string;
  side: DealSide | "all";
  is_default: boolean;
  created_at: string;
  steps?: ChecklistTemplateStep[];
}

export interface ChecklistTemplateStep {
  id: string;
  template_id: string;
  label: string;
  assignee_role: "tc" | "agent" | "any";
  days_from_effective: number | null;
  required: boolean;
  auto_notify: boolean;
  linked_doc_type: DocType | null;
  sort_order: number;
}

export interface Notification {
  id: string;
  user_id: string;
  brokerage_id: string;
  deal_id: string | null;
  title: string;
  body: string;
  channel: NotifChannel;
  read: boolean;
  created_at: string;
  // joined
  deal?: Deal;
}

// ─── View / UI types ──────────────────────────────────────────────────────────

export interface DealWithProgress extends Deal {
  progress_pct: number;
  overdue_count: number;
}

export interface AgentStats {
  user: User;
  active_deals: number;
  closed_30d: number;
  closed_ytd: number;
  on_time_rate: number;
}

export interface TCStats {
  user: User;
  active_deals: number;
  closed_30d: number;
  on_time_rate: number;
  overdue_tasks: number;
}
