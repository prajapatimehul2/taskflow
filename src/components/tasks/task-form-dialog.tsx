"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { taskInputSchema, type TaskInput } from "@/lib/validations/task";
import { createTask, updateTask } from "@/lib/actions/tasks";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toDateInputValue } from "@/lib/utils";
import type { TaskWithCategory } from "@/lib/data/tasks";

const NONE_VALUE = "none";

export type CategoryOption = { id: string; name: string; color: string };

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  task?: TaskWithCategory | null;
};

export function TaskFormDialog({ open, onOpenChange, categories, task }: TaskFormDialogProps) {
  const isEdit = Boolean(task);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskInputSchema),
    defaultValues: { title: "", description: "", categoryId: "", dueDate: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        categoryId: task?.categoryId ?? "",
        dueDate: toDateInputValue(task?.dueDate ?? null),
      });
    }
  }, [open, task, reset]);

  const onSubmit = async (values: TaskInput) => {
    const result = isEdit ? await updateTask(task!.id, values) : await createTask(values);
    if (result.ok) {
      toast.success(isEdit ? "Task updated" : "Task created");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="What needs to be done?"
              autoFocus
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title ? <p className="text-xs text-danger">{errors.title.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              placeholder="Add details (optional)"
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-xs text-danger">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-category">Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value && field.value.length > 0 ? field.value : NONE_VALUE}
                    onValueChange={(value) =>
                      field.onChange(value === NONE_VALUE ? "" : value)
                    }
                  >
                    <SelectTrigger id="task-category">
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>No category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input id="task-due-date" type="date" {...register("dueDate")} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
