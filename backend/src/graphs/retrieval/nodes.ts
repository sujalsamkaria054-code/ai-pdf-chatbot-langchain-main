import { AIMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  makeRetriever,
  makeRetrieverWithFilter,
} from '../../services/retriever.js';
import { resolveDocumentReference } from '../../services/document-resolution.js';
import {
  classifyIntent,
  classifyPreferences,
  classifyRoute,
  generateDirectResponse,
  generateRetrievedResponse,
} from '../../services/retrieval-assistant.js';
import { AgentStateAnnotation } from './state.js';
import { AssistantResponse } from '../../types/response.js';

export async function checkQueryType(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<{ route: 'retrieve' | 'direct' }> {
  return { route: await classifyRoute(state.query, config) };
}

export async function detectIntent(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<{ intent: typeof AgentStateAnnotation.State.intent }> {
  return { intent: await classifyIntent(state.query, config) };
}

export async function detectPreferences(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<{ preferences: typeof AgentStateAnnotation.State.preferences }> {
  return { preferences: await classifyPreferences(state.query, config) };
}

export async function resolveDocument(
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const resolution = resolveDocumentReference({
    query: state.query,
    uploadedDocuments: state.uploadedDocuments ?? [],
    activeDocumentId: state.activeDocumentId,
    lastReferencedDocumentId: state.lastReferencedDocumentId,
  });

  if (resolution.status === 'resolved') {
    return {
      activeDocumentId: resolution.document.id,
      lastReferencedDocumentId: resolution.document.id,
      documentResolutionError: undefined,
    };
  }

  return {
    documentResolutionError: resolution.message,
  };
}

export async function routeAfterResolution(
  state: typeof AgentStateAnnotation.State,
): Promise<'retrieveDocuments' | 'documentResolutionFallback'> {
  return state.documentResolutionError
    ? 'documentResolutionFallback'
    : 'retrieveDocuments';
}

export async function documentResolutionFallback(
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const response: AssistantResponse = {
    kind: 'text',
    title: 'Document Selection Needed',
    message:
      state.documentResolutionError ||
      'I could not determine which document to analyze.',
    blocks: [],
  };

  return {
    response,
    messages: [new AIMessage(JSON.stringify(response))],
  };
}

export async function retrieveDocuments(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const targetDocument = state.uploadedDocuments.find(
    (doc) => doc.id === state.activeDocumentId,
  );

  const retriever = targetDocument
    ? await makeRetrieverWithFilter(config, {
        filename: targetDocument.fileName,
      })
    : await makeRetriever(config);

  const response = await retriever.invoke(state.query);
  return {
    documents: response,
    lastReferencedDocumentId:
      targetDocument?.id ?? state.lastReferencedDocumentId,
  };
}

export async function generateResponse(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const { messages, response } = await generateRetrievedResponse(state, config);
  return { messages, response };
}

export async function answerQueryDirectly(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const { messages, response } = await generateDirectResponse(
    state.query,
    config,
  );
  return { messages, response };
}

export async function routeQuery(
  state: typeof AgentStateAnnotation.State,
): Promise<'retrieveDocuments' | 'directAnswer'> {
  const route = state.route;

  if (!route) {
    throw new Error('Route is not set');
  }

  if (route === 'retrieve') return 'retrieveDocuments';
  if (route === 'direct') return 'directAnswer';

  throw new Error('Invalid route');
}
