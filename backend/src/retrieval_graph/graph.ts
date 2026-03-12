import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { formatDocs } from './utils.js';
import { z } from 'zod';
import { RESPONSE_SYSTEM_PROMPT, ROUTER_SYSTEM_PROMPT , DIRECT_SYSTEM_PROMPT} from './prompts.js';
import { RunnableConfig } from '@langchain/core/runnables';
import { AIMessage } from '@langchain/core/messages';
import {
  AgentConfigurationAnnotation,
  ensureAgentConfiguration,
} from './configuration.js';
import { loadChatModel } from '../shared/utils.js';

const chartSchema = z.object({
  type: z.enum(['bar', 'line', 'pie']),
  title: z.string(),
  labels: z.array(z.string()),
  series: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.number()),
    }).strict(),
  ),
}).strict();

const headingBlockSchema = z.object({
  type: z.literal('heading'),
  text: z.string(),
}).strict();

const paragraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string(),
}).strict();

const bulletsBlockSchema = z.object({
  type: z.literal('bullets'),
  items: z.array(z.string()),
}).strict();

const chartBlockSchema = z.object({
  type: z.literal('chart'),
  chart: chartSchema,
}).strict();

const blockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  bulletsBlockSchema,
  chartBlockSchema,
]);

const responseSchema = z.object({
  kind: z.enum([
    'text_answer',
    'report',
    'chart_only',
    'report_with_chart',
    'not_found',
  ]),
  title: z.string().default(''),
  message: z.string().default(''),
  blocks: z.array(blockSchema).default([]),
}).strict();


async function checkQueryType(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<{
  route: 'retrieve' | 'direct';
}> {
  const routeSchema = z.object({
    route: z.enum(['retrieve', 'direct']),
  });

  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const formattedPrompt = await ROUTER_SYSTEM_PROMPT.invoke({
    query: state.query,
  });

  const response = await model
    .withStructuredOutput(routeSchema)
    .invoke(formattedPrompt);

  return { route: response.route };
}

async function answerQueryDirectly(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const formattedPrompt = await DIRECT_SYSTEM_PROMPT.invoke({
    question: state.query,
  });


  const response = await model
    .withStructuredOutput(responseSchema)
    .invoke(formattedPrompt);

  return {
    messages: [new AIMessage(JSON.stringify(response))],
  };
}

async function routeQuery(
  state: typeof AgentStateAnnotation.State,
): Promise<'retrieveDocuments' | 'directAnswer'> {
  const route = state.route;

  if (!route) {
    throw new Error('Route is not set');
  }

  if (route === 'retrieve') {
    return 'retrieveDocuments';
  }

  if (route === 'direct') {
    return 'directAnswer';
  }

  throw new Error('Invalid route');
}

async function retrieveDocuments(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const response = await retriever.invoke(state.query);

  return { documents: response };
}

async function generateResponse(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const context = formatDocs(state.documents);

  if (!context || context.trim().length === 0) {
    return {
      messages: [new AIMessage(JSON.stringify(notFoundResponse))],
    };
  }

  const formattedPrompt = await RESPONSE_SYSTEM_PROMPT.invoke({
    question: state.query,
    context,
  });

  const response = await model
    .withStructuredOutput(responseSchema)
    .invoke(formattedPrompt);

  return {
    messages: [new AIMessage(JSON.stringify(response))],
  };
}

const builder = new StateGraph(
  AgentStateAnnotation,
  AgentConfigurationAnnotation,
)
  .addNode('checkQueryType', checkQueryType)
  .addNode('retrieveDocuments', retrieveDocuments)
  .addNode('generateResponse', generateResponse)
  .addNode('directAnswer', answerQueryDirectly)
  .addEdge(START, 'checkQueryType')
  .addConditionalEdges('checkQueryType', routeQuery, [
    'retrieveDocuments',
    'directAnswer',
  ])
  .addEdge('retrieveDocuments', 'generateResponse')
  .addEdge('generateResponse', END)
  .addEdge('directAnswer', END);

export const graph = builder.compile().withConfig({
  runName: 'RetrievalGraph',
});