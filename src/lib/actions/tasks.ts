"use server";

import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { taskInputSchema, type TaskInput } from "@/lib/validations/task";
import type { ActionResult } from "@/lib/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";

function revalidateTaskViews() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

type ResolvedTaskData = {
  title: string;
  description: string | null;
  categoryId: string | null;
  dueDate: Date | null;
};

type ResolveResult = { ok: true; data: ResolvedTaskData } | { ok: false; error: string };

async function resolveTaskData(userId: string, data: TaskInput): Promise<ResolveResult> {
  const dueDate = data.dueDate && data.dueDate.length > 0 ? new Date(data.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return { ok: false, error: "Please enter a valid due date." };
  }

  const categoryId = data.categoryId && data.categoryId.length > 0 ? data.categoryId : null;

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });
    if (!category) {
      return { ok: false, error: "Selected category was not found." };
    }
  }

  return {
    ok: true,
    data: {
      title: data.title,
      description: data.description && data.description.length > 0 ? data.description : null,
      categoryId,
      dueDate,
    },
  };
}

export async function createTask(input: TaskInput): Promise<ActionResult> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid task details." };
  }

  try {
    const userId = await getCurrentUserId();
    const resolved = await resolveTaskData(userId, parsed.data);
    if (!resolved.ok) {
      return { ok: false, error: resolved.error };
    }

    await prisma.task.create({ data: { ...resolved.data, userId } });
    revalidateTaskViews();
    return { ok: true };
  } catch (error) {
    console.error("createTask failed:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid task details." };
  }

  try {
    const userId = await getCurrentUserId();
    const resolved = await resolveTaskData(userId, parsed.data);
    if (!resolved.ok) {
      return { ok: false, error: resolved.error };
    }

    const result = await prisma.task.updateMany({
      where: { id, userId },
      data: resolved.data,
    });
    if (result.count === 0) {
      return { ok: false, error: "Task not found." };
    }

    revalidateTaskViews();
    return { ok: true };
  } catch (error) {
    console.error("updateTask failed:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function toggleTaskStatus(id: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const task = await prisma.task.findFirst({
      where: { id, userId },
      select: { status: true },
    });
    if (!task) {
      return { ok: false, error: "Task not found." };
    }

    const nextStatus =
      task.status === TaskStatus.COMPLETED ? TaskStatus.ACTIVE : TaskStatus.COMPLETED;

    await prisma.task.updateMany({ where: { id, userId }, data: { status: nextStatus } });
    revalidateTaskViews();
    return { ok: true };
  } catch (error) {
    console.error("toggleTaskStatus failed:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const result = await prisma.task.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      return { ok: false, error: "Task not found." };
    }

    revalidateTaskViews();
    return { ok: true };
  } catch (error) {
    console.error("deleteTask failed:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}
