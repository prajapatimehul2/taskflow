"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CategoryFormDialog,
  type CategoryData,
} from "@/components/categories/category-form-dialog";
import { deleteCategory } from "@/lib/actions/categories";

type CategoryRowProps = {
  category: CategoryData;
  taskCount: number;
};

export function CategoryRow({ category, taskCount }: CategoryRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const result = await deleteCategory(category.id);
    if (result.ok) {
      toast.success("Category deleted");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="group flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-hover">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{category.name}</span>
      <span className="text-xs text-muted-foreground">
        {taskCount} {taskCount === 1 ? "task" : "tasks"}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Category actions"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CategoryFormDialog open={editOpen} onOpenChange={setEditOpen} category={category} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete category"
        description={`"${category.name}" will be removed. Tasks in this category will be kept and become uncategorized.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
