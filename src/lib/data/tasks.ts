import "server-only";
import { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type TaskFilters = {
  status?: "all" | "active" | "completed";
  categoryId?: string;
  search?: string;
};

function buildWhere(userId: string, filters: TaskFilters): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { userId };

  if (filters.status === "active") {
    where.status = TaskStatus.ACTIVE;
  } else if (filters.status === "completed") {
    where.status = TaskStatus.COMPLETED;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.search) {
    where.title = { contains: filters.search, mode: "insensitive" };
  }

  return where;
}

export async function getTasks(userId: string, filters: TaskFilters = {}) {
  return prisma.task.findMany({
    where: buildWhere(userId, filters),
    include: { category: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export type TaskWithCategory = Awaited<ReturnType<typeof getTasks>>[number];

export async function getTaskStats(userId: string) {
  const [total, completed] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: TaskStatus.COMPLETED } }),
  ]);

  const pending = total - completed;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, pending, completionRate };
}
