// ─── Enums ───────────────────────────────────────────────────

export type Plan = "free" | "pro" | "business";

export type LinkType = "link" | "header" | "social" | "embed";

export type EventType = "profile_view" | "link_click";

export type Device = "mobile" | "desktop" | "tablet";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing";

// ─── Domain Objects ──────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  plan: Plan;
  planExpiresAt: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  theme: ThemeConfig;
  isPublished: boolean;
  customDomain: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Link {
  id: string;
  profileId: string;
  title: string;
  url: string;
  icon: string | null;
  isActive: boolean;
  position: number;
  type: LinkType;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeConfig {
  preset: ThemePreset;
  accentColor?: string;
  fontFamily?: string;
  backgroundType: "solid" | "gradient";
  backgroundColor: string;
  backgroundGradient?: string;
  cardStyle: "rounded" | "pill" | "sharp";
  textColor: string;
}

export type ThemePreset =
  | "default"
  | "midnight"
  | "forest"
  | "sunset"
  | "ocean";

// ─── API Response Shapes ─────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

// ─── Public Profile (no auth) ────────────────────────────────

export interface PublicProfile {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  theme: ThemeConfig;
  links: Pick<Link, "id" | "title" | "url" | "icon" | "type">[];
}

// ─── Analytics ───────────────────────────────────────────────

export interface AnalyticsSummary {
  profileViews: number;
  linkClicks: number;
  period: "7d" | "30d";
}

export interface LinkAnalytics {
  linkId: string;
  title: string;
  clicks: number;
}

export interface DailyStats {
  date: string;
  profileViews: number;
  linkClicks: number;
}

export interface GeoBreakdown {
  country: string;
  count: number;
}

export interface ReferrerBreakdown {
  referrer: string;
  count: number;
}

// ─── Billing ─────────────────────────────────────────────────

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  plan: Plan;
}

export interface PlanLimits {
  maxLinks: number;
  analytics: boolean;
  customDomain: boolean;
  removeBranding: boolean;
  multipleProfiles: boolean;
  teamAccess: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxLinks: 5,
    analytics: false,
    customDomain: false,
    removeBranding: false,
    multipleProfiles: false,
    teamAccess: false,
  },
  pro: {
    maxLinks: Infinity,
    analytics: true,
    customDomain: true,
    removeBranding: true,
    multipleProfiles: false,
    teamAccess: false,
  },
  business: {
    maxLinks: Infinity,
    analytics: true,
    customDomain: true,
    removeBranding: true,
    multipleProfiles: true,
    teamAccess: true,
  },
};
