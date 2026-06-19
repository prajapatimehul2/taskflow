"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { categoryInputSchema, type CategoryInput } from "@/lib/validations/category";
import type { ActionResult } from "@/lib/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const DUPLICATE_ERROR = "A category with this name already exists.";
const DEFAULT_COLOR = "#787774";

function revalidateCategoryViews() {
  revalidatePath("/categories");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createCategory(input: CategoryInput): Promise<ActionResult> {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category details." };
  }

  try {
    const userId = await getCurrentUserId();
    await prisma.category.create({
      data: { name: parsed.data.name, color: parsed.data.color ?? DEFAULT_COLOR, userId },
    });
    revalidateCategoryViews();
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: DUPLICATE_ERROR };
    }
    console.error("createCategory failed:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category details." };
  }

  try {
    const userId = await getCurrentUserId();
    const result = await prisma.category.updateMany({
      where: { id, userId },
      data: { name: parsed.data.name, color: parsed.data.color ?? DEFAULT_COLOR },
    });
    if (result.count === 0) {
      return { ok: false, error: "Category not found." };
    }
    revalidateCategoryViews();
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: DUPLICATE_ERROR };
    }
    console.error("updateCategory failed:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const result = await prisma.category.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      return { ok: false, error: "Category not found." };
    }
    revalidateCategoryViews();
    return { ok: true };
  } catch (error) {
    console.error("deleteCategory failed:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}
