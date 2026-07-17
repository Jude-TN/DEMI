// ─── Core enums ───────────────────────────────────────────────────────────────

export type UserRole   = "admin" | "agent" | "tc";
export type DealStage  = "lead" | "listing" | "under_contract" | "clear_to_close" | "closed";
export type DealSide   = "buyer" | "seller" | "dual";
export type DocStatus  = "missing" | "received" | "executed" | "cleared";
export type ContactRole = "buyer" | "seller" | "buyer_agent" | "seller_agent" | "title" | "lender" | "inspector" | "other";
export type BrokeragePlan = "starter" | "pro" | "team";

// ─── Database entities (match handoff spec exactly) ───────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  license_number: string | null;
  tc_company: string | null;        // e.g. "TransactionNerd.com"
  tc_capacity_cap: number;          // default 33, TC only
  markets: string[] | null;
  created_at: string;
}

export interface Brokerage {
  id: string;
  name: string;
  team_name: string | null;
  license_number: string | null;
  primary_market: string | null;
  timezone: string;
  plan: BrokeragePlan;
  created_at: string;
}

export interface BrokerageMember {
  id: string;
  brokerage_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  joined_at: string;
  // joined
  user?: User;
  brokerage?: Brokerage;
}

export interface Deal {
  id: string;
  brokerage_id: string;
  agent_id: string;
  tc_id: string | null;
  address: string;
  city: string;
  mls_number: string | null;
  sale_price: number | null;
  side: DealSide;
  stage: DealStage;
  effective_date: string | null;
  close_date: string | null;
  closed_at: string | null;
  close_price: number | null;
  checklist_template_id: string | null;
  notes: string | null;
  created_at: string;
  archived_at: string | null;
  // joined
  agent?: User;
  tc?: User;
  brokerage?: Brokerage;
}

export interface Task {
  id: string;
  deal_id: string;
  template_step_id: string | null;
  label: string;
  assignee_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  // joined
  assignee?: User;
}

export interface Document {
  id: string;
  deal_id: string;
  uploaded_by: string | null;
  name: string;
  file_url: string | null;
  file_size_bytes: number | null;
  doc_type: string;
  status: DocStatus;
  external_ref_url: string | null;    // DocuSign envelope / Dotloop link
  uploaded_at: string | null;
  // joined
  uploader?: User;
}

export interface Contact {
  id: string;
  deal_id: string;
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
  sender_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
  sender?: User;
}

export interface TimelineEvent {
  id: string;
  deal_id: string;
  actor_id: string | null;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  deal_id: string | null;
  type: string;
  title: string;
  body: string;
  deep_link: string | null;
  read_at: string | null;
  created_at: string;
  deal?: Pick<Deal, "id" | "address">;
}

export interface ChecklistTemplate {
  id: string;
  brokerage_id: string;
  name: string;
  side: DealSide | "dual" | null;
  is_default: boolean;
  created_at: string;
  steps?: ChecklistTemplateStep[];
}

export interface ChecklistTemplateStep {
  id: string;
  template_id: string;
  label: string;
  default_assignee_role: "tc" | "agent" | null;
  days_from_effective: number | null;
  is_required: boolean;
  notify_on_complete: boolean;
  sort_order: number;
  created_at: string;
}

export interface TCRoutingRule {
  id: string;
  brokerage_id: string;
  agent_id: string;
  default_tc_id: string;
  fallback_tc_id: string | null;
  updated_at: string;
  agent?: User;
  default_tc?: User;
  fallback_tc?: User | null;
}

export interface IntegrationConnection {
  id: string;
  brokerage_id: string;
  provider: "fub" | "dotloop" | "docusign" | "skyslope" | "zapier";
  status: "connected" | "error" | "disconnected";
  last_synced_at: string | null;
  token_expires_at: string | null;
  created_at: string;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface TCCapacityResponse {
  user_id: string;
  full_name: string;
  tc_company: string | null;
  total_files: number;
  cap: number;
  available: number;
  is_recommended?: boolean;
  reason?: "default" | "fallback";
  // Only populated when requester === TC themselves
  breakdown_by_brokerage: Array<{ brokerage_id: string; team_name: string; file_count: number }> | null;
}

export interface DealWithProgress extends Deal {
  task_count: number;
  completed_task_count: number;
  overdue_task_count: number;
  progress_pct: number;
}

export interface AgentStats {
  user: User;
  active_deals: number;
  closed_30d: number;
  closed_ytd: number;
  volume_ytd: number;
}

export interface TCStats {
  user: User;
  total_files: number;
  cap: number;
  available: number;
  overdue_tasks: number;
}
