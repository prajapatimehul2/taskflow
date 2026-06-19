import { z } from "zod";

export const CATEGORY_COLORS = [
  "#787774",
  "#2383e2",
  "#448361",
  "#d44c47",
  "#cb912f",
  "#9065b0",
  "#c14c8a",
  "#337ea9",
] as const;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Name is too long"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .optional(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
