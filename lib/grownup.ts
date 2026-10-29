// The grown-up check: a quick multiplication question in front of the Grown-ups page,
// plan changes and admin, so kids don't wander into billing by accident.
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const GROWNUP_COOKIE = "grownup_ok";
const OPEN_FOR_MS = 10 * 60 * 1000; // stays unlocked on this device for 10 minutes

const key = () => process.env.GROWNUP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only";
const sign = (text: string) => createHmac("sha256", key()).update(text).digest("base64url");
const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** A new question, plus a signed token so the answer can be checked on the server. */
export function newQuestion() {
  const a = 6 + Math.floor(Math.random() * 4); // 6 to 9
  const b = 6 + Math.floor(Math.random() * 7); // 6 to 12
  const exp = Date.now() + 5 * 60 * 1000;
  const body = `${a}.${b}.${exp}`;
  return { a, b, token: `${body}.${sign(body)}` };
}

export function checkAnswer(token: string, answer: number): boolean {
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [a, b, exp, sig] = parts;
  if (!same(sig, sign(`${a}.${b}.${exp}`))) return false;
  if (Date.now() > Number(exp)) return false;
  return Number(a) * Number(b) === answer;
}

/** Cookie value that proves this user passed the check, until it expires. */
export function passValue(userId: string) {
  const exp = Date.now() + OPEN_FOR_MS;
  return { value: `${exp}.${sign(`${userId}.${exp}`)}`, maxAge: OPEN_FOR_MS / 1000 };
}

/** True if this user passed the grown-up check in the last 10 minutes on this device. */
export async function isGrownup(userId: string): Promise<boolean> {
  const raw = (await cookies()).get(GROWNUP_COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Date.now() > Number(exp)) return false;
  return same(sig, sign(`${userId}.${exp}`));
}
