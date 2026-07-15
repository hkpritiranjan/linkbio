import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { requireAuth, requirePlan, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { analyticsQuerySchema } from "@linkbio/validators";

const router = Router();

router.use(requireAuth);

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getProfile(userId: string) {
  return prisma.profile.findFirst({ where: { userId }, select: { id: true } });
}

router.get(
  "/summary",
  validate(analyticsQuerySchema, "query"),
  async (req: AuthRequest, res: Response) => {
    const profile = await getProfile(req.userId!);
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    const period = (req.query.period ?? "30d") as "7d" | "30d";
    const days = period === "7d" ? 7 : 30;

    const cacheKey = `analytics:summary:${profile.id}:${period}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) { res.json({ data: JSON.parse(cached) }); return; }

    const since = daysAgo(days);

    const [profileViews, linkClicks] = await Promise.all([
      prisma.analyticsEvent.count({
        where: { profileId: profile.id, eventType: "profile_view", createdAt: { gte: since } },
      }),
      prisma.analyticsEvent.count({
        where: { profileId: profile.id, eventType: "link_click", createdAt: { gte: since } },
      }),
    ]);

    const result = { profileViews, linkClicks, period };
    await redis.setex(cacheKey, 300, JSON.stringify(result)).catch(() => null);

    res.json({ data: result });
  }
);

router.get(
  "/links",
  validate(analyticsQuerySchema, "query"),
  async (req: AuthRequest, res: Response) => {
    const profile = await getProfile(req.userId!);
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    const period = (req.query.period ?? "30d") as "7d" | "30d";
    const since = daysAgo(period === "7d" ? 7 : 30);

    const events = await prisma.analyticsEvent.groupBy({
      by: ["linkId"],
      where: {
        profileId: profile.id,
        eventType: "link_click",
        linkId: { not: null },
        createdAt: { gte: since },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const linkIds = events.map((e) => e.linkId!);
    const links = await prisma.link.findMany({
      where: { id: { in: linkIds } },
      select: { id: true, title: true },
    });

    const titleMap = Object.fromEntries(links.map((l) => [l.id, l.title]));

    const data = events.map((e) => ({
      linkId: e.linkId!,
      title: titleMap[e.linkId!] ?? "Deleted link",
      clicks: e._count.id,
    }));

    res.json({ data });
  }
);

router.get(
  "/geo",
  requirePlan("pro"),
  validate(analyticsQuerySchema, "query"),
  async (req: AuthRequest, res: Response) => {
    const profile = await getProfile(req.userId!);
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    const period = (req.query.period ?? "30d") as "7d" | "30d";
    const since = daysAgo(period === "7d" ? 7 : 30);

    const events = await prisma.analyticsEvent.groupBy({
      by: ["country"],
      where: {
        profileId: profile.id,
        country: { not: null },
        createdAt: { gte: since },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    const data = events.map((e) => ({
      country: e.country ?? "Unknown",
      count: e._count.id,
    }));

    res.json({ data });
  }
);

router.get(
  "/referrers",
  requirePlan("pro"),
  validate(analyticsQuerySchema, "query"),
  async (req: AuthRequest, res: Response) => {
    const profile = await getProfile(req.userId!);
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    const period = (req.query.period ?? "30d") as "7d" | "30d";
    const since = daysAgo(period === "7d" ? 7 : 30);

    const events = await prisma.analyticsEvent.groupBy({
      by: ["referrer"],
      where: {
        profileId: profile.id,
        referrer: { not: null },
        createdAt: { gte: since },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    const data = events.map((e) => ({
      referrer: e.referrer ?? "Direct",
      count: e._count.id,
    }));

    res.json({ data });
  }
);

export default router;
