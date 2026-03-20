const jwt = require("jsonwebtoken");
const prisma = require("../services/prisma");

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "").trim();
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  if (digits.length === 11 && digits.startsWith("7")) return digits;
  return "";
}

/** Resolves parent from Bearer token. Supports JWT and dev-token-parent-<phone>. */
module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;
  const xParentId = req.headers["x-parent-id"];

  if (xParentId) {
    const id = parseInt(xParentId, 10);
    if (!Number.isNaN(id)) {
      const parent = await prisma.parent.findUnique({ where: { id } });
      if (parent) {
        req.parentId = parent.id;
        req.parent = parent;
        return next();
      }
    }
  }

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  if (token.startsWith("dev-token-parent-")) {
    const phone = normalizePhone(token.replace("dev-token-parent-", ""));
    if (!phone) {
      return res.status(401).json({ error: "Invalid token" });
    }
    let parent = await prisma.parent.findUnique({ where: { phone } });
    if (!parent) {
      try {
        parent = await prisma.parent.upsert({
          where: { phone },
          create: {
            phone,
            email: `phone_${phone}@temp.local`,
            password: null,
            firstName: "Родитель",
            lastName: "",
          },
          update: {},
        });
        if (process.env.NODE_ENV !== "production") {
          console.log("[parentAuth] dev-token: created fallback parent", { phone, parentId: parent.id });
        }
      } catch (createErr) {
        console.warn("[parentAuth] dev-token: parent upsert failed", createErr?.message);
        return res.status(401).json({ error: "Parent not found" });
      }
    }
    req.parentId = parent.id;
    req.parent = parent;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.parentId = decoded.id;
    req.user = decoded;
    const parent = await prisma.parent.findUnique({ where: { id: decoded.id } });
    if (parent) req.parent = parent;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
