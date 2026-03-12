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

export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
export type ResponseIntent = z.infer<typeof responseIntentSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export function getPreferredKindForIntent(
  intent: ResponseIntent,
): AssistantResponse['kind'] {
  if (intent === 'chart') return 'chart';
  if (intent === 'report_with_chart' || intent === 'trends') return 'mixed';
  if (intent === 'comparison') return 'mixed';
  if (intent === 'detailed_report' || intent === 'table') return 'report';
  return 'text';
}

export const notFoundResponse: AssistantResponse = {
  kind: 'text',
  title: 'Information Not Found',
  message:
    'The uploaded document does not contain enough information to answer this question.',
  blocks: [],
};
