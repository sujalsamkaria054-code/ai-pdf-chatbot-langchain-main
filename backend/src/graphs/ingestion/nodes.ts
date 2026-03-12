import { RunnableConfig } from '@langchain/core/runnables';
import { ingestDocuments } from '../../services/ingestion.js';
import { IndexStateAnnotation } from './state.js';

export async function ingestDocs(
  state: typeof IndexStateAnnotation.State,
  config?: RunnableConfig,
): Promise<typeof IndexStateAnnotation.Update> {
  return ingestDocuments(state, config);
}
