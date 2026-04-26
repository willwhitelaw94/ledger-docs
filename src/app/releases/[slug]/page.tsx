import { notFound } from "next/navigation";
import { getReleases } from "@/lib/releases";
import { renderMdxContent } from "@/lib/mdx";
import { InternalHeader } from "@/components/internal-header";
import { ReleaseDetail } from "./release-detail";

export const revalidate = 60;

export function generateStaticParams() {
  return getReleases().map((r) => ({ slug: r.slug }));
}

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const releases = getReleases();
  const release = releases.find((r) => r.slug === slug);
  if (!release) notFound();

  const renderedContent = await renderMdxContent(release.content);

  return (
    <>
      <InternalHeader />
      <ReleaseDetail release={release}>
        {renderedContent}
      </ReleaseDetail>
    </>
  );
}
