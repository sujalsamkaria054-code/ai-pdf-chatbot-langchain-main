import { resolveDocumentReference } from '../../src/services/document-resolution.js';

const docs = [
  {
    id: 'doc-1',
    fileName: 'sales_q1.pdf',
    uploadOrder: 0,
    uploadedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'doc-2',
    fileName: 'hr_policy.pdf',
    uploadOrder: 1,
    uploadedAt: '2026-01-01T00:01:00.000Z',
  },
];

describe('resolveDocumentReference', () => {
  it('auto-resolves single uploaded document', () => {
    const result = resolveDocumentReference({
      query: 'tell me about document',
      uploadedDocuments: [docs[0]],
    });

    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.document.fileName).toBe('sales_q1.pdf');
    }
  });

  it('resolves explicit filename mention', () => {
    const result = resolveDocumentReference({
      query: 'summarize hr policy document',
      uploadedDocuments: docs,
    });

    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.document.fileName).toBe('hr_policy.pdf');
    }
  });

  it('resolves vague reference to most recent uploaded document', () => {
    const result = resolveDocumentReference({
      query: 'tell me about this document',
      uploadedDocuments: docs,
    });

    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.document.fileName).toBe('hr_policy.pdf');
    }
  });

  it('returns no-documents fallback when nothing uploaded', () => {
    const result = resolveDocumentReference({
      query: 'summarize this file',
      uploadedDocuments: [],
    });

    expect(result.status).toBe('no_documents');
  });
});
