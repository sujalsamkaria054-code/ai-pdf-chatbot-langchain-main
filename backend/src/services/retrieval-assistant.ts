import { AIMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { ensureAgentConfiguration } from '../config/retrieval.js';
import {
  assistantResponseSchema,
  DEFAULT_USER_PREFERENCES,
  getPreferredKindForIntent,
  normalizePreferences,
  notFoundResponse,
  responseIntentSchema,
  NormalizedUserPreferences,
  ResponseIntent,
  userPreferencesSchema,
} from '../types/response.js';
import { formatDocs } from '../utils/retrieval.js';
import { loadChatModel } from '../utils/model.js';
import {
  DIRECT_SYSTEM_PROMPT,
  INTENT_SYSTEM_PROMPT,
  PREFERENCES_SYSTEM_PROMPT,
  RESPONSE_SYSTEM_PROMPT,
  ROUTER_SYSTEM_PROMPT,
} from '../graphs/retrieval/prompts.js';
import { AgentState } from '../graphs/retrieval/state.js';

const routeSchema = z.object({
  route: z.enum(['retrieve', 'direct']),
});

const intentResultSchema = z.object({
  intent: responseIntentSchema,
});

const preferencesResultSchema = z.object({
  preferences: userPreferencesSchema,
});

export async function classifyRoute(
  query: string,
  config: RunnableConfig,
): Promise<'retrieve' | 'direct'> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const formattedPrompt = await ROUTER_SYSTEM_PROMPT.invoke({ query });
  const response = await model
    .withStructuredOutput(routeSchema)
    .invoke(formattedPrompt);

  return response.route;
}

export async function classifyIntent(
  query: string,
  config: RunnableConfig,
): Promise<ResponseIntent> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const formattedPrompt = await INTENT_SYSTEM_PROMPT.invoke({ query });
  const response = await model
    .withStructuredOutput(intentResultSchema)
    .invoke(formattedPrompt);

  return response.intent;
}

export async function classifyPreferences(
  query: string,
  config: RunnableConfig,
): Promise<NormalizedUserPreferences> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  try {
    const formattedPrompt = await PREFERENCES_SYSTEM_PROMPT.invoke({ query });
    const response = await model
      .withStructuredOutput(preferencesResultSchema)
      .invoke(formattedPrompt);

    return normalizePreferences(response.preferences);
  } catch (error) {
    console.warn('Preference parsing failed, using defaults.', error);
    return DEFAULT_USER_PREFERENCES;
  }
}

export async function generateDirectResponse(
  query: string,
  config: RunnableConfig,
): Promise<{
  messages: AIMessage[];
  response: ReturnType<typeof assistantResponseSchema.parse>;
}> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const formattedPrompt = await DIRECT_SYSTEM_PROMPT.invoke({
    question: query,
  });
  const responsePayload = await model
    .withStructuredOutput(assistantResponseSchema)
    .invoke(formattedPrompt);
  const response = assistantResponseSchema.parse(responsePayload);

  return {
    messages: [new AIMessage(JSON.stringify(response))],
    response,
  };
}

export async function generateRetrievedResponse(
  state: AgentState,
  config: RunnableConfig,
): Promise<{
  messages: AIMessage[];
  response: ReturnType<typeof assistantResponseSchema.parse>;
}> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const context = formatDocs(state.documents);

  if (!context || context.trim().length === 0) {
    return {
      messages: [new AIMessage(JSON.stringify(notFoundResponse))],
      response: notFoundResponse,
    };
  }

  const intent = state.intent ?? 'general';
  const preferences = state.preferences ?? {};

  const formattedPrompt = await RESPONSE_SYSTEM_PROMPT.invoke({
    question: state.query,
    context,
    intent,
    preferredKind: getPreferredKindForIntent(intent),
    preferences: JSON.stringify(preferences),
  });

  const responsePayload = await model
    .withStructuredOutput(assistantResponseSchema)
    .invoke(formattedPrompt);
  const response = assistantResponseSchema.parse(responsePayload);

  return {
    messages: [new AIMessage(JSON.stringify(response))],
    response,
  };
}
