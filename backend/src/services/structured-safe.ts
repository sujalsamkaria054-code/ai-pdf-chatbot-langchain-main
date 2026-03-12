import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { z } from 'zod';

type SafeInvokeOptions<T> = {
  model: BaseChatModel;
  schema: z.ZodSchema<T>;
  prompt: BaseLanguageModelInput;
  fallback: T;
  maxAttempts?: number;
  logLabel: string;
};

export async function invokeStructuredSafely<T>(
  options: SafeInvokeOptions<T>,
): Promise<T> {
  const {
    model,
    schema,
    prompt,
    fallback,
    maxAttempts = 2,
    logLabel,
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const payload = await model.withStructuredOutput(schema).invoke(prompt);
      return schema.parse(payload);
    } catch (error) {
      console.warn(
        `[${logLabel}] structured invoke failed on attempt ${attempt}/${maxAttempts}`,
        error,
      );
      if (attempt === maxAttempts) {
        return fallback;
      }
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }

  return fallback;
}
