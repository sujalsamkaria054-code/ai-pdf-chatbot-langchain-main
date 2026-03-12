import { z } from 'zod';

export const chartSeriesSchema = z
  .object({
    name: z.string(),
    data: z.array(z.number()),
  })
  .strict();

export const chartDataSchema = z
  .object({
    type: z.enum(['bar', 'line', 'pie']),
    title: z.string(),
    labels: z.array(z.string()),
    series: z.array(chartSeriesSchema),
  })
  .strict();

export const headingBlockSchema = z
  .object({
    type: z.literal('heading'),
    text: z.string(),
  })
  .strict();

export const paragraphBlockSchema = z
  .object({
    type: z.literal('paragraph'),
    text: z.string(),
  })
  .strict();

export const bulletsBlockSchema = z
  .object({
    type: z.literal('bullets'),
    items: z.array(z.string()),
  })
  .strict();

export const chartBlockSchema = z
  .object({
    type: z.literal('chart'),
    chart: chartDataSchema,
  })
  .strict();

export const responseBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  bulletsBlockSchema,
  chartBlockSchema,
]);

export const assistantResponseSchema = z
  .object({
    kind: z.enum(['text', 'chart', 'report', 'mixed']),
    title: z.string().default(''),
    message: z.string().default(''),
    blocks: z.array(responseBlockSchema).default([]),
  })
  .strict();

export const normalizedAssistantResponseSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('text'),
      content: z.string(),
      sources: z.array(z.string()).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('chart'),
      summary: z.string().optional(),
      chart: z
        .object({
          chartType: z.enum(['bar', 'line', 'pie']),
          title: z.string(),
          labels: z.array(z.string()),
          values: z.array(z.number()),
        })
        .strict(),
      sources: z.array(z.string()).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('report'),
      report: z
        .object({
          title: z.string(),
          summary: z.string(),
          insights: z.array(z.string()),
          conclusion: z.string(),
          recommendations: z.array(z.string()).optional(),
          tables: z.array(z.any()).optional(),
        })
        .strict(),
      sources: z.array(z.string()).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('report_with_chart'),
      report: z
        .object({
          title: z.string(),
          summary: z.string(),
          insights: z.array(z.string()),
          conclusion: z.string(),
          recommendations: z.array(z.string()).optional(),
          tables: z.array(z.any()).optional(),
        })
        .strict(),
      chart: z
        .object({
          chartType: z.enum(['bar', 'line', 'pie']),
          title: z.string(),
          labels: z.array(z.string()),
          values: z.array(z.number()),
        })
        .strict(),
      sources: z.array(z.string()).optional(),
    })
    .strict(),
]);

export const responseIntentSchema = z.enum([
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
]);

export const agentIntentSchema = z.enum([
  'direct_answer',
  'document_summary',
  'chart_only',
  'report_only',
  'report_with_chart',
  'comparison',
  'unknown',
]);

export const chartTypePreferenceSchema = z.enum(['bar', 'line', 'pie', 'auto']);

export const reportDepthPreferenceSchema = z.enum([
  'brief',
  'standard',
  'deep',
]);

export const reportStylePreferenceSchema = z.enum([
  'business',
  'technical',
  'narrative',
  'executive',
  'neutral',
]);

const nullableOptional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === null ? undefined : value),
    schema.optional(),
  );

export const userPreferencesSchema = z
  .object({
    chartType: nullableOptional(chartTypePreferenceSchema),
    reportDepth: nullableOptional(reportDepthPreferenceSchema),
    reportStyle: nullableOptional(reportStylePreferenceSchema),
    focusArea: nullableOptional(z.string()),
    includeRecommendations: nullableOptional(z.boolean()),
    includeCharts: nullableOptional(z.boolean()),
    includeTables: nullableOptional(z.boolean()),
  })
  .strict();

export const normalizedUserPreferencesSchema = z
  .object({
    chartType: chartTypePreferenceSchema,
    reportDepth: reportDepthPreferenceSchema,
    reportStyle: reportStylePreferenceSchema,
    focusArea: z.string(),
    includeRecommendations: z.boolean(),
    includeCharts: z.boolean(),
    includeTables: z.boolean(),
  })
  .strict();

export type AssistantResponse = z.output<typeof assistantResponseSchema>;
export type NormalizedAssistantResponse = z.infer<
  typeof normalizedAssistantResponseSchema
>;
export type ResponseIntent = z.infer<typeof responseIntentSchema>;
export type AgentIntent = z.infer<typeof agentIntentSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type NormalizedUserPreferences = z.infer<
  typeof normalizedUserPreferencesSchema
>;

export const DEFAULT_USER_PREFERENCES: NormalizedUserPreferences = {
  chartType: 'auto',
  reportDepth: 'standard',
  reportStyle: 'neutral',
  focusArea: '',
  includeRecommendations: false,
  includeCharts: false,
  includeTables: false,
};

export function normalizePreferences(
  preferences?: UserPreferences,
): NormalizedUserPreferences {
  return {
    chartType: preferences?.chartType ?? DEFAULT_USER_PREFERENCES.chartType,
    reportDepth:
      preferences?.reportDepth ?? DEFAULT_USER_PREFERENCES.reportDepth,
    reportStyle:
      preferences?.reportStyle ?? DEFAULT_USER_PREFERENCES.reportStyle,
    focusArea:
      preferences?.focusArea?.trim() || DEFAULT_USER_PREFERENCES.focusArea,
    includeRecommendations:
      preferences?.includeRecommendations ??
      DEFAULT_USER_PREFERENCES.includeRecommendations,
    includeCharts:
      preferences?.includeCharts ?? DEFAULT_USER_PREFERENCES.includeCharts,
    includeTables:
      preferences?.includeTables ?? DEFAULT_USER_PREFERENCES.includeTables,
  };
}

export function getPreferredKindForIntent(
  intent: ResponseIntent,
): AssistantResponse['kind'] {
  if (intent === 'chart') return 'chart';
  if (intent === 'report_with_chart' || intent === 'trends') return 'mixed';
  if (intent === 'comparison') return 'mixed';
  if (intent === 'detailed_report' || intent === 'table') return 'report';
  return 'text';
}

export function normalizeIntent(raw?: string): AgentIntent {
  if (!raw) return 'unknown';
  const value = raw.toLowerCase().trim();

  if (value === 'direct_answer' || value === 'direct') return 'direct_answer';
  if (value === 'document_summary' || value === 'summary')
    return 'document_summary';
  if (value === 'chart_only' || value === 'chart') return 'chart_only';
  if (value === 'report_only' || value === 'report') return 'report_only';
  if (value === 'report_with_chart') return 'report_with_chart';
  if (value === 'comparison') return 'comparison';

  return 'unknown';
}

export function normalizeResponse(
  response: z.input<typeof assistantResponseSchema>,
): NormalizedAssistantResponse {
  const safe = assistantResponseSchema.parse(response);
  const textBlocks = safe.blocks
    .filter((block) => block.type === 'paragraph')
    .map((block) => block.text);
  const bulletBlocks = safe.blocks
    .filter((block) => block.type === 'bullets')
    .flatMap((block) => block.items);
  const chartBlock = safe.blocks.find((block) => block.type === 'chart');

  if (safe.kind === 'chart' && chartBlock) {
    return {
      type: 'chart',
      summary: safe.message || undefined,
      chart: {
        chartType: chartBlock.chart.type,
        title: chartBlock.chart.title,
        labels: chartBlock.chart.labels,
        values: chartBlock.chart.series[0]?.data ?? [],
      },
    };
  }

  if (safe.kind === 'mixed' && chartBlock) {
    return {
      type: 'report_with_chart',
      report: {
        title: safe.title || 'Analysis',
        summary: safe.message || textBlocks[0] || 'Summary unavailable.',
        insights: bulletBlocks,
        conclusion: textBlocks[textBlocks.length - 1] || safe.message || '',
      },
      chart: {
        chartType: chartBlock.chart.type,
        title: chartBlock.chart.title,
        labels: chartBlock.chart.labels,
        values: chartBlock.chart.series[0]?.data ?? [],
      },
    };
  }

  if (safe.kind === 'report') {
    return {
      type: 'report',
      report: {
        title: safe.title || 'Report',
        summary: safe.message || textBlocks[0] || 'Summary unavailable.',
        insights: bulletBlocks,
        conclusion: textBlocks[textBlocks.length - 1] || safe.message || '',
      },
    };
  }

  return {
    type: 'text',
    content:
      safe.message ||
      textBlocks.join('\n\n') ||
      safe.title ||
      'No response generated.',
  };
}

export const notFoundResponse: AssistantResponse = {
  kind: 'text',
  title: 'Information Not Found',
  message:
    'The uploaded document does not contain enough information to answer this question.',
  blocks: [],
};
