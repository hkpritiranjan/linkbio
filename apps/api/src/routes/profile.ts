import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { uploadAvatar, deleteAvatar } from "../lib/storage";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateProfileSchema } from "@linkbio/validators";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findFirst({
    where: { userId: req.userId! },
    include: { links: { orderBy: { position: "asc" } } },
  });

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({ data: profile });
});

router.put("/", validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findFirst({
    where: { userId: req.userId! },
  });

  if (!profile) {
    // Create profile on first update (upsert pattern)
    const { username, displayName = "New User", ...rest } = req.body;

    if (!username) {
      res.status(400).json({ error: "username is required to create a profile" });
      return;
    }

    const created = await prisma.profile.create({
      data: { userId: req.userId!, username, displayName, ...rest },
    });
    res.status(201).json({ data: created });
    return;
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: req.body,
  });

  res.json({ data: updated });
});

router.post(
  "/avatar",
  upload.single("avatar"),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(req.file.mimetype)) {
      res.status(400).json({ error: "Only JPEG, PNG, WebP allowed" });
      return;
    }

    const profile = await prisma.profile.findFirst({
      where: { userId: req.userId! },
    });

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    // Delete old avatar
    if (profile.avatarUrl) {
      await deleteAvatar(profile.avatarUrl).catch(() => null);
    }

    const avatarUrl = await uploadAvatar(req.file.buffer, req.file.mimetype);

    await prisma.profile.update({
      where: { id: profile.id },
      data: { avatarUrl },
    });

    res.json({ data: { avatarUrl } });
  }
);

export default router;
