import type { Metadata } from "next";
import { Tags } from "lucide-react";
import { getCurrentUserId } from "@/lib/session";
import { getCategories } from "@/lib/data/categories";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { CategoryRow } from "@/components/categories/category-row";
import { NewCategoryButton } from "@/components/categories/new-category-button";

export const metadata: Metadata = {
  title: "Categories · TaskFlow",
};

export default async function CategoriesPage() {
  const userId = await getCurrentUserId();
  const categories = await getCategories(userId);

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize tasks with labels."
        action={<NewCategoryButton />}
      />
      <div className="px-6 py-6">
        {categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Create a category to group your tasks."
            action={<NewCategoryButton />}
          />
        ) : (
          <div className="space-y-0.5">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={{ id: category.id, name: category.name, color: category.color }}
                taskCount={category._count.tasks}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
