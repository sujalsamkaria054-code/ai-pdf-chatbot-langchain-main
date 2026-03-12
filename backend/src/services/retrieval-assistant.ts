import { AIMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { ensureAgentConfiguration } from '../config/retrieval.js';
import {
  agentIntentSchema,
  assistantResponseSchema,
  DEFAULT_USER_PREFERENCES,
  normalizeIntent,
  normalizePreferences,
  normalizeResponse,
  notFoundResponse,
  NormalizedAssistantResponse,
  NormalizedUserPreferences,
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
import { invokeStructuredSafely } from './structured-safe.js';

const routeSchema = z.object({ route: z.enum(['retrieve', 'direct']) });
const intentResultSchema = z.object({ intent: agentIntentSchema });
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

  const parsed = await invokeStructuredSafely({
    model,
    schema: routeSchema,
    prompt: formattedPrompt,
    fallback: { route: 'retrieve' as const },
    logLabel: 'classifyRoute',
  });

  return parsed.route;
}

export async function classifyIntent(
  query: string,
  config: RunnableConfig,
): Promise<z.infer<typeof agentIntentSchema>> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);
  const formattedPrompt = await INTENT_SYSTEM_PROMPT.invoke({ query });

  const parsed = await invokeStructuredSafely({
    model,
    schema: intentResultSchema,
    prompt: formattedPrompt,
    fallback: { intent: 'unknown' },
    logLabel: 'classifyIntent',
  });

  return normalizeIntent(parsed.intent);
}

export async function classifyPreferences(
  query: string,
  config: RunnableConfig,
): Promise<NormalizedUserPreferences> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);
  const formattedPrompt = await PREFERENCES_SYSTEM_PROMPT.invoke({ query });

  const parsed = await invokeStructuredSafely({
    model,
    schema: preferencesResultSchema,
    prompt: formattedPrompt,
    fallback: {
      preferences: userPreferencesSchema.parse(DEFAULT_USER_PREFERENCES),
    },
    logLabel: 'classifyPreferences',
  });

  return normalizePreferences(userPreferencesSchema.parse(parsed.preferences));
}

function toMessageText(output: NormalizedAssistantResponse): string {
  if (output.type === 'text') return output.content;
  if (output.type === 'chart') return output.summary || output.chart.title;
  if (output.type === 'report') return output.report.summary;
  return output.report.summary;
}

export async function generateDirectResponse(
  query: string,
  config: RunnableConfig,
): Promise<{
  messages: AIMessage[];
  response: z.output<typeof assistantResponseSchema>;
  uiResponse: NormalizedAssistantResponse;
}> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const formattedPrompt = await DIRECT_SYSTEM_PROMPT.invoke({
    question: query,
  });

  const responseRaw = await invokeStructuredSafely({
    model,
    schema: assistantResponseSchema,
    prompt: formattedPrompt,
    fallback: notFoundResponse,
    logLabel: 'generateDirectResponse',
  });
  const response = assistantResponseSchema.parse(responseRaw);

  const uiResponse = normalizeResponse(response);

  return {
    messages: [new AIMessage(toMessageText(uiResponse))],
    response,
    uiResponse,
  };
}

export async function generateRetrievedResponse(
  state: AgentState,
  config: RunnableConfig,
): Promise<{
  messages: AIMessage[];
  response: z.output<typeof assistantResponseSchema>;
  uiResponse: NormalizedAssistantResponse;
}> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const context = formatDocs(state.documents);
  if (!context || context.trim().length === 0) {
    const fallback = {
      ...notFoundResponse,
      message:
        'I could not find relevant document content, but you can ask a narrower question or specify a document.',
    };
    const uiResponse = normalizeResponse(fallback);
    return {
      messages: [new AIMessage(toMessageText(uiResponse))],
      response: fallback,
      uiResponse,
    };
  }

  const formattedPrompt = await RESPONSE_SYSTEM_PROMPT.invoke({
    question: state.query,
    context,
    intent: state.agentIntent ?? 'unknown',
    preferredKind: state.agentIntent ?? 'unknown',
    preferences: JSON.stringify(state.preferences ?? DEFAULT_USER_PREFERENCES),
  });

  const responseRaw = await invokeStructuredSafely({
    model,
    schema: assistantResponseSchema,
    prompt: formattedPrompt,
    fallback: notFoundResponse,
    logLabel: 'generateRetrievedResponse',
  });
  const response = assistantResponseSchema.parse(responseRaw);

  const uiResponse = normalizeResponse(response);

  return {
    messages: [new AIMessage(toMessageText(uiResponse))],
    response,
    uiResponse,
  };
}
