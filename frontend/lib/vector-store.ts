import { Document } from '@langchain/core/documents';

export type VectorChunk = {
  id: string;
  text: string;
  metadata: Record<string, any>;
  embedding: number[];
};

const EMBEDDING_DIMENSION = 256;

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function hashToken(token: string): number {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

export function embedText(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);
  for (const token of tokenize(text)) {
    const index = hashToken(token) % EMBEDDING_DIMENSION;
    vector[index] += 1;
  }
  return normalize(vector);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i += 1) {
    dot += (a[i] || 0) * (b[i] || 0);
  }
  return dot;
}

class InMemoryVectorDatabase {
  private chunks: VectorChunk[] = [];

  addChunks(chunks: Omit<VectorChunk, 'id' | 'embedding'>[]) {
    for (const chunk of chunks) {
      this.chunks.push({
        id: crypto.randomUUID(),
        text: chunk.text,
        metadata: chunk.metadata,
        embedding: embedText(chunk.text),
      });
    }
  }

  similaritySearch(query: string, k = 5): VectorChunk[] {
    const queryEmbedding = embedText(query);

    return this.chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(chunk.embedding, queryEmbedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .filter((item) => item.score > 0)
      .map((item) => item.chunk);
  }

  clear() {
    this.chunks = [];
  }

  size() {
    return this.chunks.length;
  }
}

export const vectorDatabase = new InMemoryVectorDatabase();

export function chunkDocuments(docs: Document[], chunkSize = 900, overlap = 120) {
  const chunked: Array<{ text: string; metadata: Record<string, any> }> = [];

  for (const doc of docs) {
    const text = doc.pageContent || '';
    if (!text.trim()) continue;

    let start = 0;
    while (start < text.length) {
      const end = Math.min(text.length, start + chunkSize);
      const chunkText = text.slice(start, end).trim();
      if (chunkText) {
        chunked.push({
          text: chunkText,
          metadata: {
            ...doc.metadata,
          },
        });
      }
      if (end === text.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  }

  return chunked;
}
