import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentConfigurationAnnotation } from '../../config/retrieval.js';
import { AgentStateAnnotation } from './state.js';
import {
  answerQueryDirectly,
  checkQueryType,
  detectIntent,
  detectPreferences,
  documentResolutionFallback,
  generateResponse,
  resolveDocument,
  retrieveDocuments,
  routeAfterResolution,
  routeQuery,
} from './nodes.js';

const builder = new StateGraph(
  AgentStateAnnotation,
  AgentConfigurationAnnotation,
)
  .addNode('checkQueryType', checkQueryType)
  .addNode('resolveDocument', resolveDocument)
  .addNode('retrieveDocuments', retrieveDocuments)
  .addNode('detectIntent', detectIntent)
  .addNode('detectPreferences', detectPreferences)
  .addNode('documentResolutionFallback', documentResolutionFallback)
  .addNode('generateResponse', generateResponse)
  .addNode('directAnswer', answerQueryDirectly)
  .addEdge(START, 'checkQueryType')
  .addConditionalEdges('checkQueryType', routeQuery, [
    'resolveDocument',
    'directAnswer',
  ])
  .addConditionalEdges('resolveDocument', routeAfterResolution, [
    'retrieveDocuments',
    'documentResolutionFallback',
  ])
  .addEdge('retrieveDocuments', 'detectIntent')
  .addEdge('detectIntent', 'detectPreferences')
  .addEdge('detectPreferences', 'generateResponse')
  .addEdge('generateResponse', END)
  .addEdge('documentResolutionFallback', END)
  .addEdge('directAnswer', END);

export const graph = builder.compile().withConfig({
  runName: 'RetrievalGraph',
});
