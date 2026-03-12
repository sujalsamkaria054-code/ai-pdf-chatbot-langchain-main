import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { reduceDocs } from '../../utils/state.js';
import {
  AssistantResponse,
  NormalizedUserPreferences,
  ResponseIntent,
} from '../../types/response.js';
import {
  DocumentCollectionInput,
  UploadedDocumentMetadata,
} from '../../types/documents.js';

export const AgentStateAnnotation = Annotation.Root({
  query: Annotation<string>(),
  route: Annotation<string>(),
  intent: Annotation<ResponseIntent>(),
  ...MessagesAnnotation.spec,
  documents: Annotation<Document[], DocumentCollectionInput>({
    default: () => [],
    // @ts-ignore
    reducer: reduceDocs,
  }),
  response: Annotation<AssistantResponse | undefined>(),
  preferences: Annotation<NormalizedUserPreferences | undefined>(),
  uploadedDocuments: Annotation<UploadedDocumentMetadata[]>(),
  activeDocumentId: Annotation<string | undefined>(),
  lastReferencedDocumentId: Annotation<string | undefined>(),
  documentResolutionError: Annotation<string | undefined>(),
});

export type AgentState = typeof AgentStateAnnotation.State;
