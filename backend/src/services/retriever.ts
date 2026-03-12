import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from '../config/base.js';

export async function makeSupabaseRetriever(
  configuration: typeof BaseConfigurationAnnotation.State,
): Promise<VectorStoreRetriever> {
  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.HF_API_KEY
  ) {
    throw new Error(
      'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or HF_API_KEY missing',
    );
  }

  const embeddings = new HuggingFaceInferenceEmbeddings({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    apiKey: process.env.HF_API_KEY,
  });

  const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabaseClient,
    tableName: 'documents',
    queryName: 'match_documents',
  });

  const k = configuration.k ?? 3;
  return vectorStore.asRetriever({
    searchType: 'similarity',
    k,
    filter: configuration.filterKwargs,
  });
}

export async function makeRetriever(
  config: RunnableConfig,
): Promise<VectorStoreRetriever> {
  const configuration = ensureBaseConfiguration(config);

  switch (configuration.retrieverProvider) {
    case 'supabase':
      return makeSupabaseRetriever(configuration);
    default:
      throw new Error(
        `Unsupported retriever provider: ${configuration.retrieverProvider}`,
      );
  }
}

export async function makeRetrieverWithFilter(
  config: RunnableConfig,
  filterKwargs: Record<string, unknown>,
): Promise<VectorStoreRetriever> {
  const configurable = (config?.configurable || {}) as Record<string, unknown>;

  return makeRetriever({
    ...config,
    configurable: {
      ...configurable,
      filterKwargs: {
        ...(configurable.filterKwargs as Record<string, unknown> | undefined),
        ...filterKwargs,
      },
    },
  });
}
