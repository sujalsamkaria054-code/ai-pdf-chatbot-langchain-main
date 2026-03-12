import { StateGraph, END, START } from '@langchain/langgraph';
import { IndexConfigurationAnnotation } from '../../config/ingestion.js';
import { IndexStateAnnotation } from './state.js';
import { ingestDocs } from './nodes.js';

const builder = new StateGraph(
  IndexStateAnnotation,
  IndexConfigurationAnnotation,
)
  .addNode('ingestDocs', ingestDocs)
  .addEdge(START, 'ingestDocs')
  .addEdge('ingestDocs', END);

export const graph = builder
  .compile()
  .withConfig({ runName: 'IngestionGraph' });
