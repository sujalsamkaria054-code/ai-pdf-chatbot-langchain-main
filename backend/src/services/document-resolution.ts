import { UploadedDocumentMetadata } from '../types/documents.js';

type ResolutionSuccess = {
  status: 'resolved';
  document: UploadedDocumentMetadata;
};

type ResolutionFailure = {
  status: 'no_documents' | 'ambiguous';
  message: string;
  options?: string[];
};

export type DocumentResolution = ResolutionSuccess | ResolutionFailure;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function ordinalToIndex(query: string): number | null {
  const normalized = normalizeText(query);
  if (normalized.includes('first')) return 0;
  if (normalized.includes('second')) return 1;
  if (normalized.includes('third')) return 2;
  if (normalized.includes('fourth')) return 3;
  if (normalized.includes('fifth')) return 4;
  if (normalized.includes('last')) return -1;
  return null;
}

function scoreMentionMatch(query: string, fileName: string): number {
  const queryNorm = normalizeText(query);
  const fileNorm = normalizeText(fileName);

  if (!queryNorm || !fileNorm) return 0;
  if (queryNorm.includes(fileNorm)) return 100;

  const fileTokens = fileNorm.split(' ').filter(Boolean);
  let score = 0;
  for (const token of fileTokens) {
    if (token.length >= 3 && queryNorm.includes(token)) {
      score += 10;
    }
  }

  return score;
}

function sortByUploadOrder(docs: UploadedDocumentMetadata[]) {
  return [...docs].sort((a, b) => a.uploadOrder - b.uploadOrder);
}

export function resolveDocumentReference(params: {
  query: string;
  uploadedDocuments: UploadedDocumentMetadata[];
  activeDocumentId?: string;
  lastReferencedDocumentId?: string;
}): DocumentResolution {
  const { query, activeDocumentId, lastReferencedDocumentId } = params;
  const uploadedDocuments = sortByUploadOrder(params.uploadedDocuments);

  if (uploadedDocuments.length === 0) {
    return {
      status: 'no_documents',
      message: 'No document is uploaded yet. Please upload a document first.',
    };
  }

  if (uploadedDocuments.length === 1) {
    return { status: 'resolved', document: uploadedDocuments[0] };
  }

  const byId = new Map(uploadedDocuments.map((doc) => [doc.id, doc]));

  const ordinalIndex = ordinalToIndex(query);
  if (ordinalIndex !== null) {
    if (ordinalIndex === -1) {
      return {
        status: 'resolved',
        document: uploadedDocuments[uploadedDocuments.length - 1],
      };
    }

    if (ordinalIndex >= 0 && ordinalIndex < uploadedDocuments.length) {
      return { status: 'resolved', document: uploadedDocuments[ordinalIndex] };
    }
  }

  let bestMatch: UploadedDocumentMetadata | null = null;
  let bestScore = 0;

  for (const doc of uploadedDocuments) {
    const score = scoreMentionMatch(query, doc.fileName);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = doc;
    }
  }

  if (bestMatch && bestScore >= 10) {
    return { status: 'resolved', document: bestMatch };
  }

  const vagueDocRefPattern =
    /\b(this|the|that)\s+(document|doc|file|pdf)\b|\buploaded\s+(document|file|pdf)\b|\bthis\s+about\b/i;
  if (vagueDocRefPattern.test(query)) {
    if (lastReferencedDocumentId && byId.has(lastReferencedDocumentId)) {
      return {
        status: 'resolved',
        document: byId.get(lastReferencedDocumentId)!,
      };
    }

    if (activeDocumentId && byId.has(activeDocumentId)) {
      return {
        status: 'resolved',
        document: byId.get(activeDocumentId)!,
      };
    }

    return {
      status: 'resolved',
      document: uploadedDocuments[uploadedDocuments.length - 1],
    };
  }

  const genericAnalysisPattern =
    /\b(summarize|summary|analyze|analysis|tell me about|explain|report|insights|findings|trends|compare)\b/i;

  if (genericAnalysisPattern.test(query)) {
    if (lastReferencedDocumentId && byId.has(lastReferencedDocumentId)) {
      return {
        status: 'resolved',
        document: byId.get(lastReferencedDocumentId)!,
      };
    }

    return {
      status: 'resolved',
      document: uploadedDocuments[uploadedDocuments.length - 1],
    };
  }

  return {
    status: 'ambiguous',
    message: `I found multiple uploaded documents. Please tell me which one you want me to analyze: ${uploadedDocuments
      .map((doc) => doc.fileName)
      .join(', ')}`,
    options: uploadedDocuments.map((doc) => doc.fileName),
  };
}
