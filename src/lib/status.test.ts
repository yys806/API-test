import { describe, expect, it } from 'vitest';
import { normalizeStatusSummary } from './status';

describe('normalizeStatusSummary', () => {
  it('extracts indicator and component status from Statuspage summary payloads', () => {
    const summary = normalizeStatusSummary('OpenAI', 'https://status.openai.com', {
      status: { indicator: 'minor', description: 'Minor Service Outage' },
      components: [
        { name: 'API', status: 'operational' },
        { name: 'ChatGPT', status: 'partial_outage' }
      ],
      incidents: [{ name: 'Elevated errors', status: 'investigating', shortlink: 'https://stspg.io/test' }]
    });

    expect(summary).toMatchObject({
      provider: 'OpenAI',
      indicator: 'minor',
      description: 'Minor Service Outage',
      sourceUrl: 'https://status.openai.com'
    });
    expect(summary.components).toHaveLength(2);
    expect(summary.incidents[0].name).toBe('Elevated errors');
  });
});
