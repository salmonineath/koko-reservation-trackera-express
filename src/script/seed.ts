// Seeds an admin account. There is no self-service registration (see
// auth-service.ts) - this script is the only way to create accounts, and it
// can be run more than once with different ADMIN_EMAIL values to provision
// additional accounts.
//
// Upsert semantics: if ADMIN_EMAIL already has an account, its password is
// RESET to ADMIN_PASSWORD (useful when you don't know the current password).
// If you don't want that, use a different ADMIN_EMAIL.
//
// Usage:
//   ADMIN_EMAIL=admin@koko.com ADMIN_PASSWORD='something-long-enough' npx prisma db seed
//
// Or add ADMIN_EMAIL / ADMIN_PASSWORD to .env and just run `npx prisma db seed`.
import bcrypt from "bcryptjs";
import { prisma } from "@/config/database";

const SALT_ROUNDS = 10;

const main = async (): Promise<void> => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (in .env or as env vars) before running the seed script.",
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({ where: { email }, data: { passwordHash } });
    console.log(`Password reset for existing account: ${email} (id ${existing.id})`);
    return;
  }

  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, createdAt: true },
  });

  console.log(`Admin account created: ${user.email} (id ${user.id})`);
};

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
