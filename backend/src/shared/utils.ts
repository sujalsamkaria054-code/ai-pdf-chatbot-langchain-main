import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGroq } from '@langchain/groq';

/**
 * Load Groq chat model
 */
export async function loadChatModel(
  modelName: string = "openai/gpt-oss-20b",
  temperature: number = 0,
): Promise<BaseChatModel> {

  const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: modelName,
    temperature: temperature,
  });

  return model;
}