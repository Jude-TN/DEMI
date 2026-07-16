export type Role = "tc" | "agent";

export type TransactionStatus = "new" | "under_contract" | "pending_close" | "closed";

export type ServiceType = "listing_coordination" | "contract_to_close" | "write_an_offer";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
}

export interface Transaction {
  id: string;
  address: string;
  service_type: ServiceType;
  status: TransactionStatus;
  email_slug: string;
  closing_date: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  transaction_id: string;
  title: string;
  done: boolean;
  position: number;
}

export type StreamSource = "manual" | "email";

export interface StreamEntry {
  id: string;
  transaction_id: string;
  source: StreamSource;
  author_id: string | null;
  content: string;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Checklist {
  id: string;
  transaction_id: string;
  template_id: string | null;
  title: string;
  is_custom: boolean;
  position: number;
  items?: ChecklistItem[];
}

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  new: "New / intake",
  under_contract: "Under contract",
  pending_close: "Pending close",
  closed: "Closed",
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  listing_coordination: "Listing coordination",
  contract_to_close: "Contract to close",
  write_an_offer: "Write an offer",
};

export function emailDomain() {
  return process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN || "deals.transactionnerd.com";
}

export function slugify(address: string) {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}
