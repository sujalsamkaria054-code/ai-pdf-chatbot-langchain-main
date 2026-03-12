import {
  assistantResponseSchema,
  getPreferredKindForIntent,
  notFoundResponse,
  userPreferencesSchema,
  responseIntentSchema,
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
});
