"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  categoryInputSchema,
  type CategoryInput,
  CATEGORY_COLORS,
} from "@/lib/validations/category";
import { createCategory, updateCategory } from "@/lib/actions/categories";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type CategoryData = { id: string; name: string; color: string };

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryData | null;
};

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const isEdit = Boolean(category);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: { name: "", color: CATEGORY_COLORS[0] },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? "",
        color: category?.color ?? CATEGORY_COLORS[0],
      });
    }
  }, [open, category, reset]);

  const onSubmit = async (values: CategoryInput) => {
    const result = isEdit
      ? await updateCategory(category!.id, values)
      : await createCategory(values);
    if (result.ok) {
      toast.success(isEdit ? "Category updated" : "Category created");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              placeholder="e.g. Work"
              autoFocus
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => {
                    const selected = field.value === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        aria-label={`Select color ${color}`}
                        aria-pressed={selected}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          selected && "ring-2 ring-ring ring-offset-1 ring-offset-background",
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {selected ? <Check className="size-3.5 text-white" /> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            />
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
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
