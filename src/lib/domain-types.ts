// ---------------------------------------------------------------------------
// Types shared between server loader and client components
// ---------------------------------------------------------------------------

export type Domain = {
  slug: string;
  title: string;
  description: string;
  content: string;
  relatedDomains: string[];
  cluster: string;
};

export type DomainCluster = {
  id: string;
  label: string;
  domains: Domain[];
};

export type DomainData = {
  domains: Domain[];
  clusters: DomainCluster[];
};
