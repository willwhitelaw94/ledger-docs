import { getGlossaryTerms } from "@/lib/glossary";
import { GlossaryClient } from "./glossary-client";

export default function GlossaryPage() {
  const categories = getGlossaryTerms();
  return <GlossaryClient categories={categories} />;
}
