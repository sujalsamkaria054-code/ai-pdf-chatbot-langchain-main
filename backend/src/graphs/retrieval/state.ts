import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { reduceDocs } from '../../utils/state.js';
import {
  AssistantResponse,
  ResponseIntent,
  UserPreferences,
} from '../../types/response.js';
import { DocumentCollectionInput } from '../../types/documents.js';

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
  preferences: Annotation<UserPreferences | undefined>(),
});

export type AgentState = typeof AgentStateAnnotation.State;
