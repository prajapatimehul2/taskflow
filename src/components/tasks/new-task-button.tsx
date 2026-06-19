"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskFormDialog, type CategoryOption } from "@/components/tasks/task-form-dialog";

type NewTaskButtonProps = {
  categories: CategoryOption[];
  label?: string;
  variant?: "default" | "secondary";
};

export function NewTaskButton({
  categories,
  label = "New task",
  variant = "default",
}: NewTaskButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {label}
      </Button>
      <TaskFormDialog open={open} onOpenChange={setOpen} categories={categories} />
    </>
  );
}
