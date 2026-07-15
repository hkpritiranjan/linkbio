import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { analyticsQueue } from "../workers/analyticsWorker";

const router = Router();

const CACHE_TTL = 60; // seconds

router.get("/:username", async (req: Request, res: Response) => {
  const { username } = req.params;

  // Check Redis cache first
  const cacheKey = `profile:${username}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    res.json({ data: JSON.parse(cached) });
    return;
  }

  const profile = await prisma.profile.findFirst({
    where: {
      OR: [{ username }, { customDomain: req.hostname }],
      isPublished: true,
    },
    select: {
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      theme: true,
      links: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        select: { id: true, title: true, url: true, icon: true, type: true },
      },
    },
  });

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(profile)).catch(() => null);

  res.setHeader("X-Cache", "MISS");
  res.json({ data: profile });
});

// Non-blocking analytics — fire and forget from client perspective
router.post("/:username/view", async (req: Request, res: Response) => {
  const profile = await prisma.profile.findFirst({
    where: { username: req.params.username, isPublished: true },
    select: { id: true },
  });

  if (!profile) { res.status(204).end(); return; }

  const userAgent = req.headers["user-agent"] ?? "";
  const device = detectDevice(userAgent);
  const referrer = req.headers.referer?.slice(0, 255) ?? null;

  await analyticsQueue.add("track", {
    profileId: profile.id,
    linkId: null,
    eventType: "profile_view",
    referrer,
    device,
  }).catch(() => null);

  res.status(204).end();
});

router.post("/:username/click/:linkId", async (req: Request, res: Response) => {
  const profile = await prisma.profile.findFirst({
    where: { username: req.params.username, isPublished: true },
    select: { id: true },
  });

  if (!profile) { res.status(204).end(); return; }

  const userAgent = req.headers["user-agent"] ?? "";
  const device = detectDevice(userAgent);
  const referrer = req.headers.referer?.slice(0, 255) ?? null;

  await analyticsQueue.add("track", {
    profileId: profile.id,
    linkId: req.params.linkId,
    eventType: "link_click",
    referrer,
    device,
  }).catch(() => null);

  res.status(204).end();
});

function detectDevice(ua: string): "mobile" | "desktop" | "tablet" {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

export default router;
