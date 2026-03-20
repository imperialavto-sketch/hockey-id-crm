const prisma = require("../services/prisma");

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "").trim();
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  if (digits.length === 11 && digits.startsWith("7")) return digits;
  return "";
}

async function requestCode(req, res) {
  try {
    const { phone } = req.body || {};
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return res.status(400).json({ error: "Введите номер телефона" });
    }

    const code = "1234"; // dev: fixed code
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const existing = await prisma.parentAuthCode.findFirst({
      where: { phone: normalized },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      await prisma.parentAuthCode.update({
        where: { id: existing.id },
        data: { code, expiresAt },
      });
    } else {
      await prisma.parentAuthCode.create({
        data: { phone: normalized, code, expiresAt },
      });
    }

    res.json({ ok: true, success: true, debugCode: code });
  } catch (err) {
    console.error("[parent-mobile-auth] request-code error:", err);
    res.status(500).json({ error: "Не удалось отправить код" });
  }
}

async function verify(req, res) {
  try {
    console.log("[parent-mobile-auth] verify REQUEST", { path: req.path, url: req.url, body: JSON.stringify(req.body || {}) });
    const { phone, code } = req.body || {};
    const normalized = normalizePhone(phone);
    const trimmedCode = String(code || "").trim();
    if (!normalized) {
      return res.status(400).json({ error: "Введите номер телефона" });
    }
    if (!trimmedCode) {
      return res.status(400).json({ error: "Введите код подтверждения" });
    }

    const authCode = await prisma.parentAuthCode.findFirst({
      where: { phone: normalized },
      orderBy: { createdAt: "desc" },
    });
    if (!authCode || authCode.code !== trimmedCode) {
      console.log("[parent-mobile-auth] verify FAIL: code mismatch", { expected: authCode?.code, received: trimmedCode });
      return res.status(401).json({ error: "Неверный код" });
    }
    if (new Date() > authCode.expiresAt) {
      return res.status(401).json({ error: "Код истёк" });
    }

    let parent = await prisma.parent.findUnique({ where: { phone: normalized } });
    if (!parent) {
      parent = await prisma.parent.create({
        data: {
          phone: normalized,
          email: `phone_${normalized}@temp.local`,
          password: null,
          firstName: "Родитель",
          lastName: "",
        },
      });
    }

    const token = `dev-token-parent-${normalized}`;
    const user = {
      id: String(parent.id),
      phone: normalized,
      name: [parent.firstName, parent.lastName].filter(Boolean).join(" ") || "Родитель",
      role: "Родитель",
      email: parent.email || undefined,
    };

    console.log("[parent-mobile-auth] verify SUCCESS", { userId: user.id });
    res.json({ user, token });
  } catch (err) {
    console.error("[parent-mobile-auth] verify error:", err);
    res.status(500).json({ error: "Не удалось выполнить вход" });
  }
}

module.exports = { requestCode, verify };
