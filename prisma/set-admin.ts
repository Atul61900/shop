/**
 * Staff account management.
 *
 *   npx tsx prisma/set-admin.ts you@example.com            # grant the staff role
 *   npx tsx prisma/set-admin.ts you@example.com --revoke   # take it away
 *   npx tsx prisma/set-admin.ts --password                 # rotate the staff password
 *
 * The role lives in `User.role` as a plain string (CUSTOMER | STAFF | ADMIN).
 * This script flips it or replaces the hash; it never creates an account and
 * never prints an existing password.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

const ADMIN_EMAIL = "admin@kmrc.com.np";

/** Ambiguous characters removed so the output can be retyped by hand. */
function generatePassword(length = 20) {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

async function rotatePassword() {
  const target = (process.argv[2] ?? ADMIN_EMAIL).trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: target },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`No account found for ${target}.`);
    process.exitCode = 1;
    return;
  }

  // An explicit password may be passed through, otherwise generate one.
  const supplied = process.env.ADMIN_PASSWORD?.trim();
  const password = supplied || generatePassword();

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  // Existing sessions are dropped so a stolen cookie cannot outlive the reset.
  const { count } = await prisma.session.deleteMany({ where: { userId: user.id } });
  console.log(`Password updated for ${user.email}.`);
  console.log(
    supplied
      ? "  (taken from ADMIN_PASSWORD in your environment)"
      : `  password: ${password}   (store this now — it is not saved in plain text)`,
  );
  if (count > 0) console.log(`  signed out ${count} existing session(s).`);
}

async function setRole() {
  const email = process.argv[2]?.trim().toLowerCase();
  const revoke = process.argv.includes("--revoke");
  const role = revoke ? "CUSTOMER" : "ADMIN";

  if (!email) {
    console.error("Usage: npx tsx prisma/set-admin.ts <email> [--revoke]");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account found for ${email}.`);
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({ where: { email }, data: { role } });

  // Revoking access must end any session that still carries the old role.
  const sessions = revoke ? await prisma.session.deleteMany({ where: { userId: user.id } }) : { count: 0 };

  console.log(`${email} is now ${role}.`);
  if (revoke && sessions.count > 0) {
    console.log(`  signed out ${sessions.count} session(s) that had staff access.`);
  } else if (!revoke) {
    console.log("  They can reach /admin after signing in again.");
  }
}

async function main() {
  if (process.argv.includes("--password")) {
    await rotatePassword();
    return;
  }
  await setRole();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
