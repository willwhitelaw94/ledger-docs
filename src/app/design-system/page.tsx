import { DesignSystemClient } from "./design-system-client"
import { InternalHeader } from "@/components/internal-header"

export const metadata = {
  title: "Design System — SDD",
  description:
    "Foundations, tokens, and interactive component showcases for the Trilogy Care design system.",
}

export default function DesignSystemPage() {
  return (
    <>
      <InternalHeader />
      <DesignSystemClient />
    </>
  )
}
