"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Calendar, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { TaskStatus } from "@prisma/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskFormDialog, type CategoryOption } from "@/components/tasks/task-form-dialog";
import { CategoryChip } from "@/components/categories/category-chip";
import { deleteTask, toggleTaskStatus } from "@/lib/actions/tasks";
import { cn, formatDueDate } from "@/lib/utils";
import type { TaskWithCategory } from "@/lib/data/tasks";

type TaskRowProps = {
  task: TaskWithCategory;
  categories: CategoryOption[];
};

export function TaskRow({ task, categories }: TaskRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(
    task.status === TaskStatus.COMPLETED,
    (_current, value: boolean) => value,
  );

  const handleToggle = () => {
    startTransition(async () => {
      setOptimisticCompleted(!optimisticCompleted);
      const result = await toggleTaskStatus(task.id);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = async () => {
    const result = await deleteTask(task.id);
    if (result.ok) {
      toast.success("Task deleted");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-hover">
      <Checkbox
        checked={optimisticCompleted}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={optimisticCompleted ? "Mark task as active" : "Mark task as complete"}
      />

      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="min-w-0 flex-1 text-left"
      >
        <span
          className={cn(
            "block truncate text-sm text-foreground",
            optimisticCompleted && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
      </button>

      {task.category ? (
        <CategoryChip name={task.category.name} color={task.category.color} />
      ) : null}

      {task.dueDate ? (
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Calendar className="size-3.5" />
          {formatDueDate(task.dueDate)}
        </span>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Task actions"
          className="rounded-md p-1 text-muted-foreground opacity-100 transition-colors hover:bg-background hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100"
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

      <TaskFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        categories={categories}
        task={task}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task"
        description={`"${task.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
