import { InternalNav } from "@/components/internal-nav";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function InternalHeader({
  children,
  rightSlot,
  className,
}: {
  children?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "bg-card sticky top-0 z-50 flex h-14 items-center justify-between border-b px-4 sm:px-6",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {children}
      </div>
      <div className="flex items-center gap-2">
        <GlobalSearch />
        <ThemeToggle />
        <span className="text-muted-foreground/30">|</span>
        {rightSlot}
        <InternalNav />
      </div>
    </header>
  );
}
