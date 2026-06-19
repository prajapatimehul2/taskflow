import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { getCurrentUserId } from "@/lib/session";
import { getTaskStats } from "@/lib/data/tasks";
import { getCategories } from "@/lib/data/categories";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard · TaskFlow",
};

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const [stats, categories] = await Promise.all([getTaskStats(userId), getCategories(userId)]);

  const categorizedCount = categories.reduce((sum, category) => sum + category._count.tasks, 0);
  const uncategorizedCount = stats.total - categorizedCount;

  const breakdownItems = [
    ...categories
      .filter((category) => category._count.tasks > 0)
      .map((category) => ({
        name: category.name,
        color: category.color,
        count: category._count.tasks,
      })),
    ...(uncategorizedCount > 0
      ? [{ name: "Uncategorized", color: "#9b9a97", count: uncategorizedCount }]
      : []),
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="An overview of your progress." />
      <div className="space-y-6 px-6 py-6">
        {stats.total === 0 ? (
          <EmptyState
            icon={LayoutDashboard}
            title="Nothing to summarize yet"
            description="Create a few tasks and your progress will appear here."
            action={
              <Button asChild size="sm">
                <Link href="/tasks">Go to tasks</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Total tasks" value={stats.total} />
              <StatCard label="Completed" value={stats.completed} />
              <StatCard label="Pending" value={stats.pending} />
              <StatCard label="Completion rate" value={`${stats.completionRate}%`} />
            </div>

            {breakdownItems.length > 0 ? (
              <CategoryBreakdown items={breakdownItems} total={stats.total} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
