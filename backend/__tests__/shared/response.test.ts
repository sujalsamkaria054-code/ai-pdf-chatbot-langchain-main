import {
  assistantResponseSchema,
  DEFAULT_USER_PREFERENCES,
  getPreferredKindForIntent,
  normalizeIntent,
  normalizePreferences,
  normalizeResponse,
  notFoundResponse,
  responseIntentSchema,
  userPreferencesSchema,
} from '../../src/shared/response.js';

describe('assistantResponseSchema', () => {
  it('accepts the supported response kinds', () => {
    const validKinds = ['text', 'chart', 'report', 'mixed'] as const;

    for (const kind of validKinds) {
      const parsed = assistantResponseSchema.parse({
        kind,
        title: 'title',
        message: 'message',
        blocks: [],
      });

      expect(parsed.kind).toBe(kind);
    }
  });

  it('uses text kind for notFoundResponse', () => {
    const parsed = assistantResponseSchema.parse(notFoundResponse);
    expect(parsed.kind).toBe('text');
    expect(parsed.blocks).toEqual([]);
  });
});

describe('responseIntentSchema', () => {
  it('accepts supported natural-language intent classes', () => {
    const intents = [
      'summary',
      'detailed_report',
      'executive_summary',
      'insights',
      'trends',
      'comparison',
      'chart',
      'report_with_chart',
      'table',
      'general',
    ] as const;

    for (const intent of intents) {
      expect(responseIntentSchema.parse(intent)).toBe(intent);
    }
  });

  it('maps intents to preferred response kinds', () => {
    expect(getPreferredKindForIntent('chart')).toBe('chart');
    expect(getPreferredKindForIntent('report_with_chart')).toBe('mixed');
    expect(getPreferredKindForIntent('trends')).toBe('mixed');
    expect(getPreferredKindForIntent('detailed_report')).toBe('report');
    expect(getPreferredKindForIntent('comparison')).toBe('mixed');
    expect(getPreferredKindForIntent('table')).toBe('report');
  });
});

describe('userPreferencesSchema', () => {
  it('accepts optional natural-language derived preference payload', () => {
    const parsed = userPreferencesSchema.parse({
      chartType: 'line',
      reportDepth: 'deep',
      reportStyle: 'technical',
      focusArea: 'monthly revenue growth',
      includeRecommendations: true,
      includeCharts: true,
      includeTables: false,
    });

    expect(parsed.chartType).toBe('line');
    expect(parsed.reportDepth).toBe('deep');
    expect(parsed.reportStyle).toBe('technical');
    expect(parsed.includeRecommendations).toBe(true);
  });

  it('accepts null values from model output and normalizes to undefined', () => {
    const parsed = userPreferencesSchema.parse({
      chartType: null,
      reportDepth: null,
      reportStyle: null,
      focusArea: null,
      includeRecommendations: null,
      includeCharts: null,
      includeTables: null,
    });

    expect(parsed.chartType).toBeUndefined();
    expect(parsed.reportDepth).toBeUndefined();
    expect(parsed.reportStyle).toBeUndefined();
    expect(parsed.focusArea).toBeUndefined();
    expect(parsed.includeRecommendations).toBeUndefined();
    expect(parsed.includeCharts).toBeUndefined();
    expect(parsed.includeTables).toBeUndefined();
  });

  it('normalizes nullable/omitted preferences into safe defaults', () => {
    const normalized = normalizePreferences(
      userPreferencesSchema.parse({
        chartType: null,
        reportDepth: null,
        reportStyle: null,
        focusArea: null,
        includeRecommendations: null,
        includeCharts: null,
        includeTables: null,
      }),
    );

    expect(normalized).toEqual(DEFAULT_USER_PREFERENCES);
  });
});

describe('normalizeIntent', () => {
  it('maps malformed/unknown values to unknown', () => {
    expect(normalizeIntent('garbage')).toBe('unknown');
    expect(normalizeIntent(undefined)).toBe('unknown');
  });

  it('maps known intent aliases', () => {
    expect(normalizeIntent('chart')).toBe('chart_only');
    expect(normalizeIntent('report')).toBe('report_only');
    expect(normalizeIntent('direct')).toBe('direct_answer');
    expect(normalizeIntent('document_summary')).toBe('document_summary');
  });
});

describe('normalizeResponse', () => {
  it('produces chart output for chart kind', () => {
    const normalized = normalizeResponse(
      assistantResponseSchema.parse({
        kind: 'chart',
        title: 'Chart',
        message: 'Visual summary',
        blocks: [
          {
            type: 'chart',
            chart: {
              type: 'bar',
              title: 'Sales',
              labels: ['Jan', 'Feb'],
              series: [{ name: 'Revenue', data: [10, 20] }],
            },
          },
        ],
      }),
    );

    expect(normalized.type).toBe('chart');
  });
});
