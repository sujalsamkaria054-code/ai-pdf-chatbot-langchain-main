import { RunnableConfig } from '@langchain/core/runnables';
import { makeRetriever } from '../../services/retriever.js';
import {
  classifyIntent,
  classifyPreferences,
  classifyRoute,
  generateDirectResponse,
  generateRetrievedResponse,
} from '../../services/retrieval-assistant.js';
import { AgentStateAnnotation } from './state.js';

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

export async function retrieveDocuments(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const response = await retriever.invoke(state.query);
  return { documents: response };
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
