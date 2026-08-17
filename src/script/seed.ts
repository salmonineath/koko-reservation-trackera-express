// Seeds an admin account. There is no self-service registration (see
// auth.service.ts) - this script is the only way to create accounts, and it
// can be run more than once with different ADMIN_EMAIL values to provision
// additional accounts.
//
// Upsert semantics: if ADMIN_EMAIL already has an account, its password is
// RESET to ADMIN_PASSWORD (useful when you don't know the current password).
// If you don't want that, use a different ADMIN_EMAIL.
//
// ADMIN_FULLNAME / ADMIN_USERNAME / ADMIN_ROLE are optional, display-only
// profile fields (see user.dto.ts) - they don't grant or restrict anything.
// Omitting one leaves it unset on create, and unchanged on an existing
// account (it's never cleared just because the env var wasn't passed this time).
//
// Usage:
//   ADMIN_EMAIL=admin@koko.com ADMIN_PASSWORD='something-long-enough' npx prisma db seed
//
// Or add ADMIN_EMAIL / ADMIN_PASSWORD (and optionally ADMIN_FULLNAME /
// ADMIN_USERNAME / ADMIN_ROLE) to .env and just run `npx prisma db seed`.
import bcrypt from "bcryptjs";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const SALT_ROUNDS = 10;

const parseRole = (raw: string | undefined): UserRole | undefined => {
  if (!raw) return undefined;

  const role = raw.trim().toUpperCase();
  if (!Object.values(UserRole).includes(role as UserRole)) {
    throw new Error(
      `ADMIN_ROLE must be one of: ${Object.values(UserRole).join(", ")} (got "${raw}").`,
    );
  }
  return role as UserRole;
};

const main = async (): Promise<void> => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULLNAME?.trim() || undefined;
  const username = process.env.ADMIN_USERNAME?.trim() || undefined;
  const role = parseRole(process.env.ADMIN_ROLE);

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
    // Only include fields that were actually passed this run - `undefined`
    // means "leave as-is" to Prisma, so omitting e.g. ADMIN_FULLNAME never
    // wipes out a value set on a previous run.
    await prisma.user.update({
      where: { email },
      data: { passwordHash, fullName, username, role },
    });
    console.log(`Password reset for existing account: ${email} (id ${existing.id})`);
    return;
  }

  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, username, role },
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
