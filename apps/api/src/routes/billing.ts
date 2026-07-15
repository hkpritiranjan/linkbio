import { Router, Request, Response } from "express";
import { stripe, PRICE_IDS, planFromPriceId } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { checkoutSchema } from "@linkbio/validators";
import type Stripe from "stripe";

const router = Router();

router.post(
  "/checkout",
  requireAuth,
  validate(checkoutSchema),
  async (req: AuthRequest, res: Response) => {
    const { plan } = req.body as { plan: "pro" | "business" };

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { email: true, stripeCustomerId: true },
    });

    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: req.userId! },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${process.env.WEB_BASE_URL}/billing?success=true`,
      cancel_url: `${process.env.WEB_BASE_URL}/billing?canceled=true`,
      metadata: { userId: req.userId!, plan },
    });

    res.json({ data: { url: session.url } });
  }
);

router.post("/portal", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: "No active subscription" });
    return;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.WEB_BASE_URL}/billing`,
  });

  res.json({ data: { url: session.url } });
});

// Stripe sends raw body — must be registered BEFORE express.json()
router.post(
  "/webhook",
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) { res.status(400).end(); return; }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch {
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as "pro" | "business" | undefined;
        const subscriptionId = session.subscription as string;

        if (!userId || !plan) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: {
              plan,
              planExpiresAt: new Date(sub.current_period_end * 1000),
            },
          }),
          prisma.subscription.upsert({
            where: { stripeSubscriptionId: subscriptionId },
            create: {
              userId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: sub.items.data[0].price.id,
              status: sub.status as Stripe.Subscription.Status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
            update: {
              status: sub.status as Stripe.Subscription.Status,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          }),
        ]);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const record = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: sub.id },
        });
        if (!record) break;

        const isActive = ["active", "trialing"].includes(sub.status);
        const newPlan = isActive
          ? planFromPriceId(sub.items.data[0].price.id)
          : "free";

        await prisma.$transaction([
          prisma.subscription.update({
            where: { stripeSubscriptionId: sub.id },
            data: {
              status: sub.status as Stripe.Subscription.Status,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          }),
          prisma.user.update({
            where: { id: record.userId },
            data: {
              plan: newPlan,
              planExpiresAt: isActive
                ? new Date(sub.current_period_end * 1000)
                : null,
            },
          }),
        ]);
        break;
      }
    }

    res.json({ received: true });
  }
);

export default router;
