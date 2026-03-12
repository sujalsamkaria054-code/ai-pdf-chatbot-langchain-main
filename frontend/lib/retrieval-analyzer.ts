import { RetrievalResponse, SourceAttribution } from '@/lib/ai-types';
import { runLLM } from '@/lib/llm';
import { VectorChunk } from '@/lib/vector-store';

function buildSources(chunks: VectorChunk[]): SourceAttribution[] {
  return chunks.map((chunk) => ({
    source: chunk.metadata?.source,
    filename: chunk.metadata?.filename,
    page: chunk.metadata?.loc?.pageNumber,
  }));
}

function isValidType(type: unknown): type is RetrievalResponse['type'] {
  return (
    type === 'normal_answer' ||
    type === 'chart' ||
    type === 'report' ||
    type === 'report_with_chart'
  );
}

function safeFallback(): RetrievalResponse {
  return {
    type: 'normal_answer',
    content: 'I could not find relevant information in the uploaded documents.',
    sources: [],
  };
}

export async function analyzeRetrievedContext(
  query: string,
  chunks: VectorChunk[],
): Promise<RetrievalResponse> {
  if (!chunks.length) {
    return safeFallback();
  }

  const sources = buildSources(chunks);
  const context = chunks
    .map((chunk, index) => `Chunk ${index + 1} (meta: ${JSON.stringify(chunk.metadata)}):\n${chunk.text}`)
    .join('\n\n');

  try {
    const completion = await runLLM({
      system: `You are the analysis LLM layer in a strict pipeline.
Return exactly one valid JSON object and nothing else.
Allowed schema types: normal_answer, chart, report, report_with_chart.
Rules:
- No markdown fences.
- No commentary outside JSON.
- No null enum values.
- For chart, use chartType only from ["bar","line","pie"].
- Omit chart object unless type includes chart.
- Omit report object unless type includes report.
- Include sources as an array.
`,
      user: `Question: ${query}\n\nRetrieved Context:\n${context}`,
    });

    const parsed = JSON.parse(completion);
    if (!isValidType(parsed?.type)) {
      return safeFallback();
    }

    parsed.sources = sources;
    return parsed as RetrievalResponse;
  } catch {
    return {
      type: 'normal_answer',
      content: 'I could not create a structured analysis for that request. Please try rephrasing.',
      sources,
    };
  }
}
