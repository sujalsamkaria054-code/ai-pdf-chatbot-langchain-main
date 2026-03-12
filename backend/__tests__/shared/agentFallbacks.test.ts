import {
  classifyPreferences,
  inferIntentFromQuery,
} from '../../src/services/retrieval-assistant.js';
import { loadChatModel } from '../../src/utils/model.js';

jest.mock('../../src/utils/model.js', () => ({
  loadChatModel: jest.fn(),
}));

describe('inferIntentFromQuery', () => {
  it('handles vague Hindi/English natural asks', () => {
    expect(inferIntentFromQuery('is document ke bare me bata')).toBe(
      'document_summary',
    );
    expect(inferIntentFromQuery('report banao')).toBe('report_only');
    expect(inferIntentFromQuery('chart dikha')).toBe('chart_only');
    expect(inferIntentFromQuery('compare karo')).toBe('comparison');
    expect(inferIntentFromQuery('report and chart for this')).toBe('report_with_chart');
    expect(inferIntentFromQuery('hello there')).toBe('unknown');
  });
});

describe('classifyPreferences', () => {
  it('returns safe defaults when structured parsing fails', async () => {
    (loadChatModel as jest.Mock).mockResolvedValue({
      withStructuredOutput: () => ({
        invoke: async () => {
          throw new Error('OUTPUT_PARSING_FAILURE');
        },
      }),
    });

    const preferences = await classifyPreferences('tell me about document', {
      configurable: {},
    });

    expect(preferences).toEqual({
      chartType: 'auto',
      reportDepth: 'standard',
      reportStyle: 'neutral',
      focusArea: '',
      includeRecommendations: false,
      includeCharts: false,
      includeTables: false,
    });
  });
});
