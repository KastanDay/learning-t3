import { generateText, streamText } from 'ai'
import { createOllama } from 'ollama-ai-provider'
// import { openai } from '@ai-sdk/openai';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai'
import { decrypt, isEncrypted } from '~/utils/crypto'
import { LLMProvider, ProviderNames } from '~/types/LLMProvider'

export interface OllamaModel {
  id: string
  name: string
  parameterSize: string
  tokenLimit: number
}

export const runOllamaChat = async () => {
  console.log('In ollama runOllamaChat function')

  const ollama = createOllama({
    // custom settings
    baseURL: 'https://ollama.ncsa.ai/api',
  })

  console.log('Right before calling fetch')


  // This should work, but we're getting JSON Parse errors.
  const result = await streamText({
    maxTokens: 1024,
    messages: [
      {
        content: 'Hello!',
        role: 'user',
      },
      {
        content: 'Hello! How can I help you today?',
        role: 'assistant',
      },
      {
        content: 'I need help with my computer.',
        role: 'user',
      },
    ],
    model: ollama('llama3'),
    system: 'You are a helpful chatbot.',
  })

  console.log("after starting streamtext. Result:", result)

  for await (const textPart of result.textStream) {
    console.log('OLLAMA TEXT PART:', textPart)
  }
  return result

  // TODO: Check out the server example for how to handle streaming responses
  // https://sdk.vercel.ai/examples/next-app/chat/stream-chat-completion#server
}

export const getOllamaModels = async (ollamaProvider: LLMProvider): Promise<OllamaModel[]> => {
  if(!ollamaProvider.baseUrl) {
    throw new Error(`Ollama baseurl not defined: ${ollamaProvider.baseUrl}`)
  }
  const response = await fetch(ollamaProvider.baseUrl)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const data = await response.json()

  const ollamaModels: OllamaModel[] = data.models.map((model: any) => {
    return {
      id: model.name,
      name: model.name,
      parameterSize: model.details.parameter_size,
      tokenLimit: 4096,
    } as OllamaModel
  })

  return ollamaModels
}
