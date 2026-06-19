import { cn } from "@/lib/utils";

type CategoryChipProps = {
  name: string;
  color?: string;
  className?: string;
};

export function CategoryChip({ name, color = "#787774", className }: CategoryChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {name}
    </span>
  );
}
