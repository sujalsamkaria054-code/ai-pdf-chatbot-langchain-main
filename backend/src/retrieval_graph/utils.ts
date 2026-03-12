import { Document } from '@langchain/core/documents';

const MAX_DOCS = 3;
const MAX_CHARS_PER_DOC = 1500;
const MAX_TOTAL_CHARS = 4000;

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function formatDoc(doc: Document, index: number): string {
  const metadata = doc.metadata || {};
  const source =
    metadata.source || metadata.filename || metadata.uuid || `Document ${index}`;

  const pageNumber =
    metadata.loc?.pageNumber ??
    metadata.pageNumber ??
    metadata.page ??
    undefined;

  const content = cleanText(String(doc.pageContent || '')).slice(
    0,
    MAX_CHARS_PER_DOC,
  );

  const metaParts = [
    `source="${String(source)}"`,
    pageNumber ? `page="${String(pageNumber)}"` : null,
  ].filter(Boolean);

  return [
    `<document ${metaParts.join(' ')}>`,
    content,
    `</document>`,
  ].join('\n');
}

export function formatDocs(docs?: Document[]): string {
  if (!docs || docs.length === 0) {
    return '<documents></documents>';
  }

  const limitedDocs = docs.slice(0, MAX_DOCS);
  let totalChars = 0;
  const formattedDocs: string[] = [];

  for (let i = 0; i < limitedDocs.length; i++) {
    const rawContent = cleanText(String(limitedDocs[i].pageContent || ''));
    if (!rawContent) continue;

    const remainingChars = MAX_TOTAL_CHARS - totalChars;
    if (remainingChars <= 0) break;

    const trimmedDoc: Document = {
      ...limitedDocs[i],
      pageContent: rawContent.slice(0, Math.min(MAX_CHARS_PER_DOC, remainingChars)),
    };

    const formatted = formatDoc(trimmedDoc, i + 1);
    formattedDocs.push(formatted);
    totalChars += trimmedDoc.pageContent.length;
  }

  return `<documents>\n${formattedDocs.join('\n\n')}\n</documents>`;
}