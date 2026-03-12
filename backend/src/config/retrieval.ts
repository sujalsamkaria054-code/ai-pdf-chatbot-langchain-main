import { Annotation } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from './base.js';

export const AgentConfigurationAnnotation = Annotation.Root({
  ...BaseConfigurationAnnotation.spec,
  queryModel: Annotation<string>,
});

export function ensureAgentConfiguration(
  config: RunnableConfig,
): typeof AgentConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<
    typeof AgentConfigurationAnnotation.State
  >;

  const baseConfig = ensureBaseConfiguration(config);

  return {
    ...baseConfig,
    queryModel: configurable.queryModel || 'openai/gpt-oss-20b',
  };
}
