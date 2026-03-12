import fs from 'fs/promises';
import { RunnableConfig } from '@langchain/core/runnables';
import { ensureIndexConfiguration } from '../config/ingestion.js';
import { makeRetriever } from './retriever.js';
import { reduceDocs } from '../utils/state.js';
import { IndexStateType } from '../graphs/ingestion/state.js';

export async function ingestDocuments(
  state: IndexStateType,
  config?: RunnableConfig,
): Promise<{ docs: 'delete' }> {
  if (!config) {
    throw new Error('Configuration required to run index_docs.');
  }

  const configuration = ensureIndexConfiguration(config);
  let docs = state.docs;

  if (!docs || docs.length === 0) {
    if (configuration.useSampleDocs) {
      const fileContent = await fs.readFile(configuration.docsFile, 'utf-8');
      const serializedDocs = JSON.parse(fileContent);
      docs = reduceDocs([], serializedDocs);
    } else {
      throw new Error('No sample documents to index.');
    }
  } else {
    docs = reduceDocs([], docs).map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: 'uploaded_document',
      },
    }));
  }

  const retriever = await makeRetriever(config);
  await retriever.addDocuments(docs);

  return { docs: 'delete' };
}
