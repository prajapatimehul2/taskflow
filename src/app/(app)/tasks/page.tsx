import type { Metadata } from "next";
import { ListTodo, SearchX } from "lucide-react";
import { getCurrentUserId } from "@/lib/session";
import { getTasks } from "@/lib/data/tasks";
import { getCategories } from "@/lib/data/categories";
import { taskStatusFilterSchema } from "@/lib/validations/task";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { NewTaskButton } from "@/components/tasks/new-task-button";
import { TaskList } from "@/components/tasks/task-list";
import { TaskFilters } from "@/components/tasks/task-filters";

export const metadata: Metadata = {
  title: "Tasks · TaskFlow",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const userId = await getCurrentUserId();
  const params = await searchParams;

  const status = taskStatusFilterSchema.parse(
    typeof params.status === "string" ? params.status : "all",
  );
  const categoryId = typeof params.category === "string" ? params.category : undefined;
  const search = typeof params.q === "string" ? params.q.trim() : undefined;

  const [tasks, categories] = await Promise.all([
    getTasks(userId, { status, categoryId, search: search || undefined }),
    getCategories(userId),
  ]);

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
  }));

  const hasFilters = status !== "all" || Boolean(categoryId) || Boolean(search);
  const showFilters = tasks.length > 0 || hasFilters;

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Everything on your plate."
        action={<NewTaskButton categories={categoryOptions} />}
      />
      <div className="space-y-4 px-6 py-6">
        {showFilters ? <TaskFilters categories={categoryOptions} /> : null}

        {tasks.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No matching tasks"
              description="Try adjusting your search or filters."
            />
          ) : (
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              description="Create your first task to get started."
              action={<NewTaskButton categories={categoryOptions} />}
            />
          )
        ) : (
          <TaskList tasks={tasks} categories={categoryOptions} />
        )}
      </div>
    </div>
  );
}
