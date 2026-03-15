const prisma = require("../services/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await prisma.parent.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const parent = await prisma.parent.create({
      data: {
        email,
        password: hashed,
      },
    });

    const token = jwt.sign(
      { id: parent.id, email: parent.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _p, ...parentSafe } = parent;
    res.json({ token, parent: parentSafe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const parent = await prisma.parent.findUnique({
      where: { email },
    });

    if (!parent) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, parent.password);

    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: parent.id, email: parent.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _p, ...parentSafe } = parent;
    res.json({ token, parent: parentSafe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
