import { runLLM } from '@/lib/llm';
import { RouteDecision } from '@/lib/ai-types';

const RETRIEVAL_HINTS = [
  'document',
  'pdf',
  'file',
  'report',
  'summary',
  'summarize',
  'insight',
  'chart',
  'graph',
  'trend',
  'statistic',
  'compare',
  'analysis',
  'breakdown',
];

export async function routeQuestion(query: string): Promise<RouteDecision> {
  const lower = query.toLowerCase();
  const hasRetrievalHint = RETRIEVAL_HINTS.some((hint) => lower.includes(hint));

  try {
    const routed = await runLLM({
      system:
        'You are a router agent. Return only valid JSON with exactly one key: {"route":"direct"} or {"route":"retrieve"}. Choose retrieve if uploaded document context is needed.',
      user: `Question: ${query}`,
      temperature: 0,
    });

    const parsed = JSON.parse(routed) as RouteDecision;
    if (parsed.route === 'direct' || parsed.route === 'retrieve') {
      return parsed;
    }
  } catch {
    // Fall back to deterministic heuristic routing.
  }

  return { route: hasRetrievalHint ? 'retrieve' : 'direct' };
}
