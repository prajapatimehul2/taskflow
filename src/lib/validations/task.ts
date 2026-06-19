import { z } from "zod";

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().trim().max(2000, "Description is too long").optional(),
  categoryId: z.string().optional(),
  dueDate: z.string().optional(),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

export const taskStatusFilterSchema = z.enum(["all", "active", "completed"]).catch("all");
