import { PrismaClient } from "@prisma/client";
import { isSupportedBcryptHash } from "../src/lib/password-hash";

const prisma = new PrismaClient();

function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "<invalid-email>";
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, password: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  let valid = 0;
  let invalid = 0;
  const invalidRows: Array<{
    id: string;
    email: string;
    role: string;
    hint: string;
  }> = [];

  for (const user of users) {
    if (isSupportedBcryptHash(user.password)) {
      valid += 1;
      continue;
    }
    invalid += 1;
    invalidRows.push({
      id: user.id,
      email: redactEmail(user.email),
      role: user.role,
      hint: user.password?.trim() ? "non-bcrypt-or-corrupted" : "empty",
    });
  }

  console.log("User password hash audit");
  console.log("========================");
  console.log(`Total users:   ${users.length}`);
  console.log(`Valid bcrypt:  ${valid}`);
  console.log(`Invalid rows:  ${invalid}`);

  if (invalidRows.length > 0) {
    console.log("\nInvalid samples (up to 20):");
    for (const row of invalidRows.slice(0, 20)) {
      console.log(`- ${row.id} | ${row.email} | ${row.role} | ${row.hint}`);
    }
    console.log(
      "\nRemediation: set a new bcrypt password hash for each invalid row before production rollout."
    );
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error("Password audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
