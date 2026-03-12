import { Annotation } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { reduceDocs } from '../../utils/state.js';
import { DocumentCollectionInput } from '../../types/documents.js';

export const IndexStateAnnotation = Annotation.Root({
  docs: Annotation<Document[], DocumentCollectionInput>({
    default: () => [],
    reducer: reduceDocs,
  }),
});

export type IndexStateType = typeof IndexStateAnnotation.State;
