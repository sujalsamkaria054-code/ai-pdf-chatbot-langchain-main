import { Document } from '@langchain/core/documents';

export function formatDocs(docs: Document[]): string {
  return docs
    .map((doc, i) => `<Document id="${i}">\n${doc.pageContent}\n</Document>`)
    .join('\n\n');
}
