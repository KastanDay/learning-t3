// task is to iterate through the models and find available models that can run on ollama
import {
    OPENAI_API_HOST,
    OPENAI_API_TYPE,
    OPENAI_API_VERSION,
    OPENAI_ORGANIZATION,
} from '@/utils/app/const'

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai'
import { decrypt, isEncrypted } from '~/utils/crypto'
import { LLMProvider, ProviderNames } from '~/types/LLMProvider'
import { getOllamaModels, runOllamaChat } from '~/utils/modelProviders/ollama'
//import { VercelAISDK } from 'vercel-ai-sdk'
export const config = {
    runtime: 'edge',
}

export interface AzureModel {
    id: string
    name: string
    parameterSize: string
    tokenLimit: number
}

/*
export const runAzureChat = async () => {
    console.log('In azure RunAzureChat function')

    const ollama = createAzure({
    // custom settings
    baseURL: 'https://ollama.ncsa.ai/api',
    })

    console.log('Right before calling fetch')
    const result = await generateText({
    maxTokens: 50,
    model: ollama('llama3:8b'),
    prompt: 'Invent a new holiday and describe its traditions.',
    })
    console.log(
    'generateText result: ---------------------------------------------',
    )
    console.log(result.text)
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')
    return result.text

    // This should work, but we're getting JSON Parse errors.
    // const result = await streamText({
    //   maxTokens: 1024,
    //   messages: [
    //     {
    //       content: 'Hello!',
    //       role: 'user',
    //     },
    //     {
    //       content: 'Hello! How can I help you today?',
    //       role: 'assistant',
    //     },
    //     {
    //       content: 'I need help with my computer.',
    //       role: 'user',
    //     },
    //   ],
    //   model: model,
    //   system: 'You are a helpful chatbot.',
    // })

    // console.log("after starting streamtext. Result:", result)

    // for await (const textPart of result.textStream) {
    //   console.log('OLLAMA TEXT PART:', textPart)
    // }
    // return result

    // const messages = [
    //   {
    //     role: 'tool',
    //     content: 'why is the sky blue?',
    //   },
    // ]

    // console.log('OLLAMA RESULT', result.text)

    // TODO: Check out the server example for how to handle streaming responses
    // https://sdk.vercel.ai/examples/next-app/chat/stream-chat-completion#server
}
*/

/*
export const getAzureModels = async () => {

   
    const response = await fetch('https://ollama.ncsa.ai/api/tags')
    if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()

    const ollamaModels: AzureModel[] = data.models.map((model: any) => {
    return {
        id: model.name,
        name: model.name,
        parameterSize: model.details.parameter_size,
        tokenLimit: 4096,
    } as AzureModel
    })

    return ollamaModels
}
*/
