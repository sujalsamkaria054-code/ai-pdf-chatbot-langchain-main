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
import {
  AssistantResponse,
  DEFAULT_USER_PREFERENCES,
  normalizeIntent,
  normalizeResponse,
} from '../../types/response.js';

function isDocumentQuery(query: string): boolean {
  return /\b(document|doc|file|pdf|uploaded)\b/i.test(query);
}

export async function detectIntent(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const intent = normalizeIntent(await classifyIntent(state.query, config));
  return { agentIntent: intent };
}

export async function detectPreferences(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  return { preferences: await classifyPreferences(state.query, config) };
}

export async function checkQueryType(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const route = await classifyRoute(state.query, config);
  return {
    route,
    retryCount: 0,
    preferences: DEFAULT_USER_PREFERENCES,
  };
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

  return { documentResolutionError: resolution.message };
}

export async function decideRetrieval(
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const intent = state.agentIntent ?? 'unknown';

  const retrievalIntents = new Set([
    'document_summary',
    'comparison',
    'report_only',
    'report_with_chart',
    'chart_only',
  ]);

  const needsRetrieval =
    state.route === 'retrieve' ||
    retrievalIntents.has(intent) ||
    isDocumentQuery(state.query);

  return { needsRetrieval };
}

export async function routeAfterResolution(
  state: typeof AgentStateAnnotation.State,
): Promise<'detectIntent' | 'documentResolutionFallback'> {
  return state.documentResolutionError
    ? 'documentResolutionFallback'
    : 'detectIntent';
}

export async function routeAfterPlanning(
  state: typeof AgentStateAnnotation.State,
): Promise<'retrieveDocuments' | 'generateResponse'> {
  return state.needsRetrieval ? 'retrieveDocuments' : 'generateResponse';
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
  const uiResponse = normalizeResponse(response);

  return {
    response,
    uiResponse,
    messages: [
      new AIMessage(uiResponse.type === 'text' ? uiResponse.content : ''),
    ],
  };
}

export async function retrieveDocuments(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  try {
    const targetDocument = (state.uploadedDocuments ?? []).find(
      (doc) => doc.id === state.activeDocumentId,
    );

    const retriever = targetDocument
      ? await makeRetrieverWithFilter(config, {
          filename: targetDocument.fileName,
        })
      : await makeRetriever(config);

    const docs = await retriever.invoke(state.query);

    return {
      documents: docs,
      lastReferencedDocumentId:
        targetDocument?.id ?? state.lastReferencedDocumentId,
      error: undefined,
    };
  } catch (error) {
    return {
      documents: [],
      error: `Retrieval failed: ${String(error)}`,
    };
  }
}

export async function planResponse(
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const agentIntent = state.agentIntent ?? 'unknown';

  if (agentIntent === 'unknown') {
    return { agentIntent: 'direct_answer' };
  }

  return { agentIntent };
}

export async function generateResponse(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  try {
    if (!state.needsRetrieval || state.route === 'direct') {
      const { messages, response, uiResponse } = await generateDirectResponse(
        state.query,
        config,
      );
      return { messages, response, uiResponse, error: undefined };
    }

    const { messages, response, uiResponse } = await generateRetrievedResponse(
      state,
      config,
    );
    return { messages, response, uiResponse, error: undefined };
  } catch (error) {
    return {
      error: `Generation failed: ${String(error)}`,
    };
  }
}

export async function recoverFromError(
  state: typeof AgentStateAnnotation.State,
): Promise<typeof AgentStateAnnotation.Update> {
  const retryCount = (state.retryCount ?? 0) + 1;

  if (retryCount <= 1) {
    return {
      retryCount,
      needsRetrieval: false,
      agentIntent: 'direct_answer',
      error: undefined,
    };
  }

  const response: AssistantResponse = {
    kind: 'text',
    title: 'Best-effort response',
    message:
      'I hit a transient issue while generating the answer. Please try rephrasing your question, and I will continue with a best-effort analysis.',
    blocks: [],
  };
  const uiResponse = normalizeResponse(response);

  return {
    retryCount,
    response,
    uiResponse,
    messages: [
      new AIMessage(uiResponse.type === 'text' ? uiResponse.content : ''),
    ],
    error: undefined,
  };
}

export async function routeAfterGenerate(
  state: typeof AgentStateAnnotation.State,
): Promise<'recoverFromError' | '__end__'> {
  return state.error ? 'recoverFromError' : '__end__';
}
