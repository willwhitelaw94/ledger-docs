import { getDomains } from "@/lib/domains";
import { DomainsClient } from "./domains-client";

export default function DomainsPage() {
  const data = getDomains();
  return <DomainsClient data={data} />;
}
