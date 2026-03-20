const express = require("express");
const parentAuth = require("../middleware/parentAuth");
const prisma = require("../services/prisma");

const router = express.Router();

function getPeriodBounds() {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function mapSubscription(sub) {
  return {
    id: String(sub.id),
    planCode: sub.planCode,
    status: sub.status,
    billingInterval: sub.billingInterval,
    currentPeriodStart: sub.currentPeriodStart.toISOString?.()?.slice(0, 10) ?? String(sub.currentPeriodStart),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString?.()?.slice(0, 10) ?? String(sub.currentPeriodEnd),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
  };
}

function mapBillingRecord(r) {
  return {
    id: String(r.id),
    date: r.date?.toISOString?.()?.slice(0, 10) ?? String(r.date),
    productName: r.productName,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    type: r.type ?? "subscription",
  };
}

router.get("/status", parentAuth, async (req, res) => {
  try {
    const parentId = req.parentId;
    let sub = await prisma.subscription.findUnique({
      where: { parentId },
    });
    if (!sub) {
      const { start, end } = getPeriodBounds();
      sub = await prisma.subscription.create({
        data: {
          parentId,
          planCode: "basic",
          status: "active",
          billingInterval: "monthly",
          currentPeriodStart: new Date(start),
          currentPeriodEnd: new Date(end),
          cancelAtPeriodEnd: false,
        },
      });
    }
    res.json(mapSubscription(sub));
  } catch (err) {
    console.error("[subscription/status] error:", err);
    res.status(500).json({ error: "Не удалось получить статус подписки" });
  }
});

router.get("/history", parentAuth, async (req, res) => {
  try {
    const parentId = req.parentId;
    const records = await prisma.subscriptionBillingRecord.findMany({
      where: { parentId },
      orderBy: { date: "desc" },
      take: 50,
    });
    res.json(records.map(mapBillingRecord));
  } catch (err) {
    console.error("[subscription/history] error:", err);
    res.status(500).json({ error: "Не удалось получить историю подписки" });
  }
});

router.post("/", parentAuth, async (req, res) => {
  try {
    const parentId = req.parentId;
    const { planCode = "basic", billingInterval = "monthly" } = req.body || {};
    const { start, end } = getPeriodBounds();

    const existing = await prisma.subscription.findUnique({
      where: { parentId },
    });
    if (existing) {
      await prisma.subscription.update({
        where: { parentId },
        data: {
          planCode,
          billingInterval,
          status: "active",
          currentPeriodStart: new Date(start),
          currentPeriodEnd: new Date(end),
          cancelAtPeriodEnd: false,
        },
      });
      const updated = await prisma.subscription.findUnique({
        where: { parentId },
      });
      return res.json(mapSubscription(updated));
    }

    const sub = await prisma.subscription.create({
      data: {
        parentId,
        planCode,
        status: "active",
        billingInterval,
        currentPeriodStart: new Date(start),
        currentPeriodEnd: new Date(end),
        cancelAtPeriodEnd: false,
      },
    });
    res.status(201).json(mapSubscription(sub));
  } catch (err) {
    console.error("[subscription POST] error:", err);
    res.status(500).json({ error: "Не удалось оформить подписку" });
  }
});

router.get("/plans", async (_req, res) => {
  try {
    res.json([
      { id: "basic", code: "basic", name: "Базовый", priceMonthly: 0, priceYearly: 0, features: [] },
      { id: "pro", code: "pro", name: "Про", priceMonthly: 499, priceYearly: 4990, features: [] },
      { id: "elite", code: "elite", name: "Элит", priceMonthly: 999, priceYearly: 9990, features: [] },
    ]);
  } catch (err) {
    res.status(500).json({ error: "Не удалось загрузить планы" });
  }
});

router.post("/cancel", parentAuth, async (req, res) => {
  try {
    const parentId = req.parentId;
    const sub = await prisma.subscription.findUnique({
      where: { parentId },
    });
    if (!sub) {
      return res.status(404).json({ error: "Подписка не найдена" });
    }
    await prisma.subscription.update({
      where: { parentId },
      data: { cancelAtPeriodEnd: true },
    });
    const updated = await prisma.subscription.findUnique({
      where: { parentId },
    });
    res.json(mapSubscription(updated));
  } catch (err) {
    console.error("[subscription/cancel] error:", err);
    res.status(500).json({ error: "Не удалось отменить подписку" });
  }
});

module.exports = router;
