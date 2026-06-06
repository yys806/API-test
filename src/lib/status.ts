export type StatusComponent = {
  name: string;
  status: string;
};

export type StatusIncident = {
  name: string;
  status: string;
  url?: string;
};

export type ProviderStatusSummary = {
  provider: string;
  sourceUrl: string;
  indicator: string;
  description: string;
  components: StatusComponent[];
  incidents: StatusIncident[];
};

type StatusPayload = {
  status?: { indicator?: string; description?: string };
  components?: Array<{ name?: string; status?: string }>;
  incidents?: Array<{ name?: string; status?: string; shortlink?: string }>;
};

export function normalizeStatusSummary(provider: string, sourceUrl: string, payload: StatusPayload): ProviderStatusSummary {
  return {
    provider,
    sourceUrl,
    indicator: payload.status?.indicator ?? 'unknown',
    description: payload.status?.description ?? 'Unknown',
    components: (payload.components ?? [])
      .filter((component) => component.name)
      .map((component) => ({
        name: component.name ?? 'Unknown',
        status: component.status ?? 'unknown'
      })),
    incidents: (payload.incidents ?? [])
      .filter((incident) => incident.name)
      .map((incident) => ({
        name: incident.name ?? 'Unknown incident',
        status: incident.status ?? 'unknown',
        url: incident.shortlink
      }))
  };
}
