import { getPersonas } from "@/lib/personas";
import { PersonasClient } from "./personas-client";

export default function PersonasPage() {
  const personas = getPersonas();
  return <PersonasClient personas={personas} />;
}
