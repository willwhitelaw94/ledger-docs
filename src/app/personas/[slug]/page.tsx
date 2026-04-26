import { notFound } from "next/navigation";
import { getPersonaBySlug, getPersonas } from "@/lib/personas";
import { PersonaDetailPage } from "./persona-detail";

export const revalidate = 60;

export function generateStaticParams() {
  return getPersonas().map((p) => ({ slug: p.slug }));
}

export default async function PersonaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const persona = getPersonaBySlug(slug);
  if (!persona) notFound();

  return <PersonaDetailPage persona={persona} />;
}
