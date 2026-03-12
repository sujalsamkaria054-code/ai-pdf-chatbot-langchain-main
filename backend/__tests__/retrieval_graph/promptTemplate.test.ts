import {
  INTENT_SYSTEM_PROMPT,
  PREFERENCES_SYSTEM_PROMPT,
  ROUTER_SYSTEM_PROMPT,
  RESPONSE_SYSTEM_PROMPT,
} from '../../src/retrieval_graph/prompts.js';

describe('Prompt Templates', () => {
  describe('ROUTER_SYSTEM_PROMPT', () => {
    it('should format the router prompt correctly', async () => {
      const query = 'What is the capital of France?';
      const formattedPrompt = await ROUTER_SYSTEM_PROMPT.invoke({
        query,
      });

      expect(formattedPrompt.toString()).toContain(
        'You are a routing assistant',
      );
      expect(formattedPrompt.toString()).toContain(query);
      expect(formattedPrompt.toString()).toContain('"retrieve"');
      expect(formattedPrompt.toString()).toContain('"direct"');
    });
  });

  describe('INTENT_SYSTEM_PROMPT', () => {
    it('should emphasize semantic intent inference', async () => {
      const formattedPrompt = await INTENT_SYSTEM_PROMPT.invoke({
        query: 'show performance visually',
      });

      expect(formattedPrompt.toString()).toContain('Infer intent SEMANTICALLY');
      expect(formattedPrompt.toString()).toContain(
        'Do NOT rely on exact keyword matching',
      );
      expect(formattedPrompt.toString()).toContain(
        '"show performance visually" => chart_only',
      );
      expect(formattedPrompt.toString()).toContain(
        '"is document ke bare me bata" => document_summary',
      );
    });
  });

  describe('RESPONSE_SYSTEM_PROMPT', () => {
    it('should format the response prompt correctly', async () => {
      const context = 'Paris is the capital of France.';
      const question = 'Tell me about the capital of France.';

      const formattedPrompt = await RESPONSE_SYSTEM_PROMPT.invoke({
        context: 'Paris is the capital of France.',
        question: 'Tell me about the capital of France.',
        intent: 'summary',
        preferredKind: 'text',
        preferences: JSON.stringify({ reportDepth: 'brief' }),
      });

      console.log(formattedPrompt.toString());

      expect(formattedPrompt.toString()).toContain(
        'You are a professional document analysis and reporting assistant',
      );
      expect(formattedPrompt.toString()).toContain(context);
      expect(formattedPrompt.toString()).toContain(question);
      expect(formattedPrompt.toString()).toContain('Parsed user preferences');
    });
  });

  describe('PREFERENCES_SYSTEM_PROMPT', () => {
    it('should capture optional user preferences semantically', async () => {
      const formattedPrompt = await PREFERENCES_SYSTEM_PROMPT.invoke({
        query: 'Use a technical style, go deep, and include recommendations',
      });

      expect(formattedPrompt.toString()).toContain(
        'extract optional presentation preferences',
      );
      expect(formattedPrompt.toString()).toContain(
        'Do NOT rely on exact keyword matching only',
      );
      expect(formattedPrompt.toString()).toContain('includeRecommendations');
    });
  });
});
