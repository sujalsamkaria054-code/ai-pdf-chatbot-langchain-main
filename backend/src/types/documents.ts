import { Document } from '@langchain/core/documents';

export type DocumentCollectionInput =
  | Document[]
  | { [key: string]: any }[]
  | string[]
  | string
  | 'delete';

export type UploadedDocumentMetadata = {
  id: string;
  fileName: string;
  uploadOrder: number;
  uploadedAt: string;
};
