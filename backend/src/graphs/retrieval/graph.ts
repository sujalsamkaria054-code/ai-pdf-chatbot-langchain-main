import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentConfigurationAnnotation } from '../../config/retrieval.js';
import { AgentStateAnnotation } from './state.js';
import {
  checkQueryType,
  detectIntent,
  detectPreferences,
  decideRetrieval,
  documentResolutionFallback,
  generateResponse,
  planResponse,
  recoverFromError,
  resolveDocument,
  retrieveDocuments,
  routeAfterGenerate,
  routeAfterPlanning,
  routeAfterResolution,
} from './nodes.js';

const builder = new StateGraph(
  AgentStateAnnotation,
  AgentConfigurationAnnotation,
)
  .addNode('checkQueryType', checkQueryType)
  .addNode('resolveDocument', resolveDocument)
  .addNode('detectIntent', detectIntent)
  .addNode('detectPreferences', detectPreferences)
  .addNode('decideRetrieval', decideRetrieval)
  .addNode('planResponse', planResponse)
  .addNode('retrieveDocuments', retrieveDocuments)
  .addNode('generateResponse', generateResponse)
  .addNode('recoverFromError', recoverFromError)
  .addNode('documentResolutionFallback', documentResolutionFallback)
  .addEdge(START, 'checkQueryType')
  .addEdge('checkQueryType', 'resolveDocument')
  .addConditionalEdges('resolveDocument', routeAfterResolution, [
    'detectIntent',
    'documentResolutionFallback',
  ])
  .addEdge('detectIntent', 'detectPreferences')
  .addEdge('detectPreferences', 'decideRetrieval')
  .addEdge('decideRetrieval', 'planResponse')
  .addConditionalEdges('planResponse', routeAfterPlanning, [
    'retrieveDocuments',
    'generateResponse',
  ])
  .addEdge('retrieveDocuments', 'generateResponse')
  .addConditionalEdges('generateResponse', routeAfterGenerate, [
    'recoverFromError',
    END,
  ])
  .addEdge('recoverFromError', 'generateResponse')
  .addEdge('documentResolutionFallback', END);

export const graph = builder.compile().withConfig({
  runName: 'RetrievalGraph',
});
