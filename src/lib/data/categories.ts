import "server-only";
import { prisma } from "@/lib/db";

export async function getCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { tasks: true } },
    },
  });
}

export type CategoryWithCount = Awaited<ReturnType<typeof getCategories>>[number];
