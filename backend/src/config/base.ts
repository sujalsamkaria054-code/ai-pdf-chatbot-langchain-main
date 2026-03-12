import { Annotation } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';

export const BaseConfigurationAnnotation = Annotation.Root({
  retrieverProvider: Annotation<'supabase'>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterKwargs: Annotation<Record<string, any>>,
  k: Annotation<number>,
});

export function ensureBaseConfiguration(
  config: RunnableConfig,
): typeof BaseConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<
    typeof BaseConfigurationAnnotation.State
  >;

  return {
    retrieverProvider: configurable.retrieverProvider || 'supabase',
    filterKwargs: configurable.filterKwargs || {},
    k: configurable.k || 5,
  };
}
