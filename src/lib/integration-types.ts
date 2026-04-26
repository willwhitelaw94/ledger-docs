// ---------------------------------------------------------------------------
// Types & constants shared between server loader and client components
// ---------------------------------------------------------------------------

export type IntegrationCategory =
  | "crm"
  | "finance"
  | "communication"
  | "auth"
  | "government"
  | "data"
  | "booking";

export type Integration = {
  slug: string;
  title: string;
  description: string;
  category: IntegrationCategory;
  what: string;
  who: string;
  keyFlow: string;
  maturity: string;
  pod: string;
  relatedDomains: string[];
};

export const CATEGORY_META: Record<
  IntegrationCategory,
  { label: string; order: number }
> = {
  crm: { label: "CRM & Sales", order: 0 },
  finance: { label: "Finance & Accounting", order: 1 },
  communication: { label: "Communication", order: 2 },
  auth: { label: "Authentication", order: 3 },
  government: { label: "Government APIs", order: 4 },
  data: { label: "Data & Analytics", order: 5 },
  booking: { label: "Booking", order: 6 },
};
