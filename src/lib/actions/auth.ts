"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";

export type AuthActionState = { error: string } | undefined;

const GENERIC_CREDENTIALS_ERROR = "Invalid email or password";

export async function loginAction(input: unknown): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: GENERIC_CREDENTIALS_ERROR };
  }

  const { email, password } = parsed.data;

  if (!rateLimit(`login:${email.toLowerCase()}`)) {
    return { error: "Too many attempts. Please try again in a minute." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: GENERIC_CREDENTIALS_ERROR };
    }
    throw error;
  }
}

export async function signupAction(input: unknown): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please check the form and try again." };
  }

  const { name, email, password } = parsed.data;

  if (!rateLimit(`signup:${email}`)) {
    return { error: "Too many attempts. Please try again in a minute." };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "An account with this email already exists." };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { name, email, passwordHash } });
  } catch (error) {
    console.error("Signup failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created. Please log in." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
