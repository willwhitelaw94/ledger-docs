import { getReleases } from "@/lib/releases"
import { ReleasesTimeline } from "./releases-client"
import { InternalHeader } from "@/components/internal-header"

export default function ReleasesPage() {
  const releases = getReleases()
  return (
    <>
      <InternalHeader />
      <ReleasesTimeline releases={releases} />
    </>
  )
}
