import { InternalHeader } from "@/components/internal-header";
import { PlugIcon } from "lucide-react";

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <InternalHeader>
        <PlugIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Integrations
        </span>
      </InternalHeader>
      <div className="flex-1">{children}</div>
    </div>
  );
}
