import { Document } from '@langchain/core/documents';
import { v4 as uuidv4 } from 'uuid';
import { DocumentCollectionInput } from '../types/documents.js';

export function reduceDocs(
  existing?: Document[],
  newDocs?: DocumentCollectionInput,
): Document[] {
  if (newDocs === 'delete') {
    return [];
  }

  const existingList = existing || [];
  const existingIds = new Set(existingList.map((doc) => doc.metadata?.uuid));

  if (typeof newDocs === 'string') {
    const docId = uuidv4();
    return [
      ...existingList,
      { pageContent: newDocs, metadata: { uuid: docId } },
    ];
  }

  const newList: Document[] = [];
  if (Array.isArray(newDocs)) {
    for (const item of newDocs) {
      if (typeof item === 'string') {
        const itemId = uuidv4();
        newList.push({ pageContent: item, metadata: { uuid: itemId } });
        existingIds.add(itemId);
      } else if (typeof item === 'object') {
        const metadata = (item as Document).metadata ?? {};
        const itemId = metadata.uuid ?? uuidv4();

        if (!existingIds.has(itemId)) {
          if ('pageContent' in item) {
            newList.push({
              ...(item as Document),
              metadata: { ...metadata, uuid: itemId },
            });
          } else {
            newList.push({
              pageContent: '',
              metadata: { ...(item as { [key: string]: any }), uuid: itemId },
            });
          }
          existingIds.add(itemId);
        }
      }
    }
  }

  return [...existingList, ...newList];
}
