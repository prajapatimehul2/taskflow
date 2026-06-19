"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type AppShellProps = {
  userName?: string | null;
  userEmail?: string | null;
  children: React.ReactNode;
};

export function AppShell({ userName, userEmail, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar userName={userName} userEmail={userEmail} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b border-border bg-background px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open navigation"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent className="p-0" aria-describedby={undefined}>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar
                userName={userName}
                userEmail={userEmail}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold text-foreground">TaskFlow</span>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
