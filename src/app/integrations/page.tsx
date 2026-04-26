import { getIntegrations } from "@/lib/integrations";
import { getDomains } from "@/lib/domains";
import { IntegrationsClient } from "./integrations-client";

export default function IntegrationsPage() {
  const integrations = getIntegrations();
  const domainData = getDomains();

  return (
    <IntegrationsClient integrations={integrations} domainData={domainData} />
  );
}
