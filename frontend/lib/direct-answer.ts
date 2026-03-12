import { runLLM } from '@/lib/llm';

export async function getDirectAnswer(query: string): Promise<string> {
  try {
    return await runLLM({
      system: 'You are a helpful assistant. Answer directly and concisely in plain text.',
      user: query,
      temperature: 0.3,
    });
  } catch {
    return 'I can help with that, but the direct-answer model is currently unavailable.';
  }
}
