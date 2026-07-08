import { hash, verify } from "@node-rs/argon2";
import { createHash, randomInt, randomBytes } from "node:crypto";

// Argon2id per docs/05 §2 (OWASP baseline: 19 MiB memory, 2 iterations).
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password, ARGON2);
  } catch {
    return false;
  }
}

// Pre-computed hash of an unguessable value — verified against when the user does
// not exist so login timing does not reveal which emails are registered.
let dummyHashPromise: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString("hex"));
  return dummyHashPromise;
}

// One-time codes/tokens are stored hashed — a DB leak must not leak live codes.
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateVerifyCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < 10)
    return "Password must be at least 10 characters.";
  if (pw.length > 128) return "Password must be at most 128 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw))
    return "Password must contain at least one letter and one digit.";
  return null;
}

export function validateEmail(email: unknown): string | null {
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return "Enter a valid email address.";
  return null;
}
