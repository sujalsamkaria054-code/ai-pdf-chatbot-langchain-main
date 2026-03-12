import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentConfigurationAnnotation } from '../../config/retrieval.js';
import { AgentStateAnnotation } from './state.js';
import {
  answerQueryDirectly,
  checkQueryType,
  detectIntent,
  detectPreferences,
  generateResponse,
  retrieveDocuments,
  routeQuery,
} from './nodes.js';

const builder = new StateGraph(
  AgentStateAnnotation,
  AgentConfigurationAnnotation,
)
  .addNode('checkQueryType', checkQueryType)
  .addNode('retrieveDocuments', retrieveDocuments)
  .addNode('detectIntent', detectIntent)
  .addNode('detectPreferences', detectPreferences)
  .addNode('generateResponse', generateResponse)
  .addNode('directAnswer', answerQueryDirectly)
  .addEdge(START, 'checkQueryType')
  .addConditionalEdges('checkQueryType', routeQuery, [
    'retrieveDocuments',
    'directAnswer',
  ])
  .addEdge('retrieveDocuments', 'detectIntent')
  .addEdge('detectIntent', 'detectPreferences')
  .addEdge('detectPreferences', 'generateResponse')
  .addEdge('generateResponse', END)
  .addEdge('directAnswer', END);

export const graph = builder.compile().withConfig({
  runName: 'RetrievalGraph',
});
