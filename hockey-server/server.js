require("dotenv").config();
const express = require("express");
const prisma = require("./services/prisma");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/api/auth", require("./routes/auth"));
app.use("/api/players", require("./routes/players"));
app.use("/api/teams", require("./routes/teams"));
app.use("/api/schedule", require("./routes/schedule"));
app.use("/api/video-analysis", require("./routes/videoAnalysis"));
app.use("/api/ai-analysis", require("./routes/aiAnalysis"));

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "hockey-server" });
});

async function main() {
  const parentCount = await prisma.parent.count();
  console.log("Prisma connected. Parent count:", parentCount);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
