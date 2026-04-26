"use client";

import { InternalHeader } from "@/components/internal-header";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DocsHeader() {
  return (
    <InternalHeader>
      <SidebarTrigger />
    </InternalHeader>
  );
}
