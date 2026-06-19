"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CategoryOption } from "@/components/tasks/task-form-dialog";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

const ALL_CATEGORIES = "all";

export function TaskFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "all";
  const currentCategory = searchParams.get("category") ?? ALL_CATEGORIES;
  const currentQuery = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(currentQuery);

  useEffect(() => {
    setSearch(currentQuery);
  }, [currentQuery]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === "all" || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== currentQuery) {
        updateParams({ q: search || null });
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [search, currentQuery, updateParams]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className="pl-8"
        />
      </div>

      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="Filter by status"
          className="inline-flex rounded-md border border-border p-0.5"
        >
          {STATUS_OPTIONS.map((option) => {
            const isActive = currentStatus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateParams({ status: option.value })}
                aria-pressed={isActive}
                className={cn(
                  "rounded-[4px] px-2.5 py-1 text-[13px] transition-colors",
                  isActive
                    ? "bg-hover font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <Select
          value={currentCategory}
          onValueChange={(value) => updateParams({ category: value })}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
