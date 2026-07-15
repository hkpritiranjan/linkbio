import { Queue, Worker, Job } from "bullmq";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";

interface TrackJob {
  profileId: string;
  linkId: string | null;
  eventType: "profile_view" | "link_click";
  referrer: string | null;
  device: "mobile" | "desktop" | "tablet";
}

export const analyticsQueue = new Queue<TrackJob>("analytics", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 500,
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});

export function startAnalyticsWorker() {
  const worker = new Worker<TrackJob>(
    "analytics",
    async (job: Job<TrackJob>) => {
      const { profileId, linkId, eventType, referrer, device } = job.data;

      await prisma.analyticsEvent.create({
        data: {
          profileId,
          linkId,
          eventType,
          referrer,
          device,
        },
      });
    },
    {
      connection: redis,
      concurrency: 50, // batch writes concurrently
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[AnalyticsWorker] job ${job?.id} failed:`, err.message);
  });

  console.log("[AnalyticsWorker] started");
  return worker;
}

// Nightly aggregation — called by cron or scheduler
export async function aggregateAnalytics(date: Date) {
  const profiles = await prisma.profile.findMany({ select: { id: true } });

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  for (const { id: profileId } of profiles) {
    const [profileViews, clicksByLink, topCountries, topReferrers] =
      await Promise.all([
        prisma.analyticsEvent.count({
          where: { profileId, eventType: "profile_view", createdAt: { gte: start, lte: end } },
        }),
        prisma.analyticsEvent.groupBy({
          by: ["linkId"],
          where: { profileId, eventType: "link_click", linkId: { not: null }, createdAt: { gte: start, lte: end } },
          _count: { id: true },
        }),
        prisma.analyticsEvent.groupBy({
          by: ["country"],
          where: { profileId, country: { not: null }, createdAt: { gte: start, lte: end } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        prisma.analyticsEvent.groupBy({
          by: ["referrer"],
          where: { profileId, referrer: { not: null }, createdAt: { gte: start, lte: end } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
      ]);

    const linkClicks: Record<string, number> = {};
    for (const row of clicksByLink) {
      if (row.linkId) linkClicks[row.linkId] = row._count.id;
    }

    await prisma.analyticsAggregate.upsert({
      where: { profileId_date: { profileId, date: start } },
      create: {
        profileId,
        date: start,
        profileViews,
        linkClicks,
        topCountries: topCountries.map((r) => ({ country: r.country, count: r._count.id })),
        topReferrers: topReferrers.map((r) => ({ referrer: r.referrer, count: r._count.id })),
      },
      update: {
        profileViews,
        linkClicks,
        topCountries: topCountries.map((r) => ({ country: r.country, count: r._count.id })),
        topReferrers: topReferrers.map((r) => ({ referrer: r.referrer, count: r._count.id })),
      },
    });
  }
}
