import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createLinkSchema,
  updateLinkSchema,
  reorderLinksSchema,
} from "@linkbio/validators";
import { PLAN_LIMITS } from "@linkbio/types";

const router = Router();

router.use(requireAuth);

async function getProfileForUser(userId: string) {
  return prisma.profile.findFirst({ where: { userId } });
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const profile = await getProfileForUser(req.userId!);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const links = await prisma.link.findMany({
    where: { profileId: profile.id },
    orderBy: { position: "asc" },
  });

  res.json({ data: links });
});

router.post("/", validate(createLinkSchema), async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { plan: true },
  });

  const profile = await getProfileForUser(req.userId!);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const plan = (user?.plan ?? "free") as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];

  if (limits.maxLinks !== Infinity) {
    const count = await prisma.link.count({ where: { profileId: profile.id } });
    if (count >= limits.maxLinks) {
      res.status(403).json({
        error: `Free plan limited to ${limits.maxLinks} links. Upgrade to add more.`,
        requiredPlan: "pro",
      });
      return;
    }
  }

  const lastLink = await prisma.link.findFirst({
    where: { profileId: profile.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const link = await prisma.link.create({
    data: {
      ...req.body,
      profileId: profile.id,
      position: (lastLink?.position ?? -1) + 1,
    },
  });

  res.status(201).json({ data: link });
});

router.put("/reorder", validate(reorderLinksSchema), async (req: AuthRequest, res: Response) => {
  const profile = await getProfileForUser(req.userId!);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const { links } = req.body as { links: { id: string; position: number }[] };

  await prisma.$transaction(
    links.map(({ id, position }) =>
      prisma.link.updateMany({
        where: { id, profileId: profile.id },
        data: { position },
      })
    )
  );

  res.json({ data: { message: "Reordered" } });
});

router.put("/:id", validate(updateLinkSchema), async (req: AuthRequest, res: Response) => {
  const profile = await getProfileForUser(req.userId!);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const link = await prisma.link.findFirst({
    where: { id: req.params.id, profileId: profile.id },
  });

  if (!link) { res.status(404).json({ error: "Link not found" }); return; }

  const updated = await prisma.link.update({
    where: { id: link.id },
    data: req.body,
  });

  res.json({ data: updated });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const profile = await getProfileForUser(req.userId!);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const link = await prisma.link.findFirst({
    where: { id: req.params.id, profileId: profile.id },
  });

  if (!link) { res.status(404).json({ error: "Link not found" }); return; }

  await prisma.link.delete({ where: { id: link.id } });

  res.json({ data: { message: "Deleted" } });
});

export default router;
