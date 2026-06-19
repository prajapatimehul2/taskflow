type BreakdownItem = {
  name: string;
  color: string;
  count: number;
};

type CategoryBreakdownProps = {
  items: BreakdownItem[];
  total: number;
};

export function CategoryBreakdown({ items, total }: CategoryBreakdownProps) {
  return (
    <section className="rounded-lg border border-border">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">By category</h2>
      </header>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const percent = total === 0 ? 0 : Math.round((item.count / total) * 100);
          return (
            <li key={item.name} className="flex items-center gap-3 px-4 py-3">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <span className="w-32 shrink-0 truncate text-sm text-foreground">{item.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hover">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: item.color }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                {item.count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
