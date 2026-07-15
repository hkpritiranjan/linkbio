import { z } from "zod";

// ─── Helpers ─────────────────────────────────────────────────

const RESERVED_USERNAMES = new Set([
  "admin", "api", "login", "signup", "register", "dashboard",
  "profile", "settings", "billing", "analytics", "public",
  "static", "assets", "favicon", "robots", "sitemap", "health",
  "p", "u", "app", "www", "mail", "support", "help", "about",
  "terms", "privacy", "contact", "blog", "docs",
]);

const urlSchema = z
  .string()
  .url("Must be a valid URL")
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: "Only http/https URLs are allowed" }
  );

// ─── Auth ─────────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Profile ──────────────────────────────────────────────────

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-z0-9_-]+$/, "Only lowercase letters, numbers, hyphens, underscores")
  .refine((val) => !RESERVED_USERNAMES.has(val), {
    message: "This username is reserved",
  });

export const themeConfigSchema = z.object({
  preset: z.enum(["default", "midnight", "forest", "sunset", "ocean"]),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontFamily: z.string().optional(),
  backgroundType: z.enum(["solid", "gradient"]),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundGradient: z.string().optional(),
  cardStyle: z.enum(["rounded", "pill", "sharp"]),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(160).nullable().optional(),
  theme: themeConfigSchema.optional(),
  isPublished: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── Links ────────────────────────────────────────────────────

export const createLinkSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  url: urlSchema,
  icon: z.string().max(10).nullable().optional(),
  isActive: z.boolean().default(true),
  type: z.enum(["link", "header", "social", "embed"]).default("link"),
});

export const updateLinkSchema = createLinkSchema.partial();

export const reorderLinksSchema = z.object({
  links: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type ReorderLinksInput = z.infer<typeof reorderLinksSchema>;

// ─── Analytics ───────────────────────────────────────────────

export const analyticsQuerySchema = z.object({
  period: z.enum(["7d", "30d"]).default("30d"),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

// ─── Billing ─────────────────────────────────────────────────

export const checkoutSchema = z.object({
  plan: z.enum(["pro", "business"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
