export type Visibility = "public" | "private";

export type Tier = { id: string; name: string; price: number };
export type Question = { id: string; label: string; is_child: boolean };
export type BringItem = { id: string; item: string; takenBy: string | null };

/** What every page works with, whether the data came from Supabase or the demo set. */
export type EventVM = {
  id: string;
  slug: string;
  kind: string;
  visibility: Visibility;
  category: import("./core").Category; // filter on What's on
  title: string;
  host: string;
  about: string;
  start: string; // ISO
  mins: number;
  tz: string;
  mode: "In person" | "Online";
  venue: string; // full address (only shown when allowed)
  area: string; // shown when the address is hidden
  hide: boolean;
  approval: boolean;
  plus: boolean;
  maxPlus: number;
  capacity: number;
  cur: "NGN" | "GBP";
  cert: boolean;
  cpd: number;
  sponsors: string[];
  tiers: Tier[];
  questions: Question[];
  bring: BringItem[];
  going: number;
  maybe: number;
  /** Most confirmed guests allowed: 100 on the free plan, unlimited with Moona Pro or Event Boost. */
  guestCap: number;
  /** The host's own uploaded flyer (public image URL in Supabase Storage), shown instead of the generated poster. */
  flyer?: string | null;
  /** True only when the host has Moona Pro AND switched the Moona logo off for this event. */
  brandingOff?: boolean;
};

export type Pass = {
  token: string;
  code: string;
  name: string;
  plus: number;
  status: "going" | "maybe" | "pending" | "declined" | "cancelled";
  tierName: string;
  price: number;
  paymentStatus: "none" | "pending" | "paid" | "refunded";
  event: EventVM;
};
