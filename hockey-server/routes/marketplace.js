const express = require("express");
const prisma = require("../services/prisma");

async function optionalParentAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const xParentId = req.headers["x-parent-id"];
  if (xParentId) {
    const id = parseInt(xParentId, 10);
    if (!Number.isNaN(id)) {
      const parent = await prisma.parent.findUnique({ where: { id } });
      if (parent) req.parentId = parent.id;
    }
  }
  if (authHeader) {
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (token.startsWith("dev-token-parent-")) {
      const phone = token.replace("dev-token-parent-", "");
      if (phone) {
        const parent = await prisma.parent.findUnique({ where: { phone } });
        if (parent) req.parentId = parent.id;
      }
    }
  }
  next();
}

const router = express.Router();

function mapCoachToList(coach) {
  const spec = coach.specialization || (Array.isArray(coach.specialties) ? coach.specialties[0] : null);
  return {
    id: coach.id,
    name: coach.fullName,
    specialization: spec || "",
    rating: coach.rating ?? null,
    priceFrom: coach.priceFrom ?? 0,
    city: coach.city ?? "",
    avatar: coach.photoUrl || coach.avatar || null,
    description: coach.bio || coach.description || null,
  };
}

function mapCoachToDetail(coach) {
  const services = (coach.services || []).map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    durationMinutes: s.durationMinutes,
    price: s.price,
    format: s.format,
  }));
  return {
    ...mapCoachToList(coach),
    services,
  };
}

router.get("/coaches", async (req, res) => {
  try {
    const coaches = await prisma.coachProfile.findMany({
      where: { isPublished: true },
      include: { services: true },
    });
    res.json(coaches.map(mapCoachToList));
  } catch (err) {
    console.error("[marketplace/coaches] error:", err);
    res.status(500).json({ error: "Не удалось загрузить тренеров" });
  }
});

router.get("/coaches/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid coach id" });
    }
    const coach = await prisma.coachProfile.findUnique({
      where: { id },
      include: { services: true },
    });
    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }
    res.json(mapCoachToDetail(coach));
  } catch (err) {
    console.error("[marketplace/coaches/:id] error:", err);
    res.status(500).json({ error: "Не удалось загрузить тренера" });
  }
});

router.get("/coaches/:coachId/slots", async (req, res) => {
  try {
    const coachId = parseInt(req.params.coachId, 10);
    if (Number.isNaN(coachId)) {
      return res.status(400).json({ error: "Invalid coach id" });
    }
    const coach = await prisma.coachProfile.findUnique({
      where: { id: coachId },
    });
    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }
    const slots = await prisma.coachSlot.findMany({
      where: { coachId, available: true },
    });
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const result = slots
      .filter((s) => s.startTime >= now && s.startTime <= nextWeek)
      .map((s) => ({
        time: s.startTime.toISOString(),
        available: s.available,
      }));
    if (result.length === 0) {
      // stub: return some placeholder slots for dev
      const stub = [];
      for (let i = 1; i <= 5; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        d.setHours(10, 0, 0, 0);
        stub.push({ time: d.toISOString(), available: true });
      }
      return res.json(stub);
    }
    res.json(result);
  } catch (err) {
    console.error("[marketplace/coaches/:coachId/slots] error:", err);
    res.status(500).json({ error: "Не удалось загрузить слоты" });
  }
});

router.post("/booking-request", optionalParentAuth, async (req, res) => {
  try {
    const { coachId } = req.body || {};
    const coachIdNum = parseInt(coachId, 10);
    if (Number.isNaN(coachIdNum)) {
      return res.status(400).json({ error: "coachId is required" });
    }
    const coach = await prisma.coachProfile.findUnique({
      where: { id: coachIdNum },
    });
    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }
    let parentId = null;
    let parentName = null;
    let parentPhone = null;
    if (req.parentId) {
      parentId = req.parentId;
      const parent = await prisma.parent.findUnique({ where: { id: parentId } });
      if (parent) {
        parentName = [parent.firstName, parent.lastName].filter(Boolean).join(" ") || "Родитель";
        parentPhone = parent.phone || "";
      }
    }
    const booking = await prisma.bookingRequest.create({
      data: {
        coachId: coachIdNum,
        parentId,
        parentName: parentName || "Гость",
        parentPhone: parentPhone || "",
        status: "new",
      },
    });
    res.status(201).json({
      id: String(booking.id),
      message: "Заявка создана",
      coachId: String(coachIdNum),
    });
  } catch (err) {
    console.error("[marketplace/booking-request] error:", err);
    res.status(500).json({ error: "Не удалось создать заявку" });
  }
});

module.exports = router;
