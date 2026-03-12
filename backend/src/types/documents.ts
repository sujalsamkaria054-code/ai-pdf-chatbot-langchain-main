import { Document } from '@langchain/core/documents';

export type DocumentCollectionInput =
  | Document[]
  | { [key: string]: any }[]
  | string[]
  | string
  | 'delete';
