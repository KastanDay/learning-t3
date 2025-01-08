import { NextApiRequest, NextApiResponse } from 'next'
import { ChatBody, Content, ImageBody, OpenAIChatMessage } from '~/types/chat'
import { decryptKeyIfNeeded } from '~/utils/crypto'

import { OpenAIError, OpenAIStream } from '@/utils/server'
import { OpenAIModelID, OpenAIModels } from '~/utils/modelProviders/types/openai'
import { ProviderNames } from '~/utils/modelProviders/LLMProvider'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { contentArray, llmProviders, model } = req.body as ImageBody

    const systemPrompt = getImageDescriptionSystemPrompt()

    const messages: OpenAIChatMessage[] = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: systemPrompt,
          },
        ],
      },
      { role: 'user', content: [...contentArray] },
    ]

    console.log("model,", model)
    console.log("llmProviders.openai", llmProviders.OpenAI)
    console.log("llmProviders.azure", llmProviders.Azure)

    if (!llmProviders?.OpenAI?.apiKey && !llmProviders?.Azure?.apiKey) {
      // If they don't have any API key, fallback to using Vlad's
      if (llmProviders?.OpenAI) {
        llmProviders.OpenAI.apiKey = process.env.VLADS_OPENAI_KEY
      } else {
        llmProviders.OpenAI = {
          provider: ProviderNames.OpenAI,
          enabled: true,
          apiKey: process.env.VLADS_OPENAI_KEY,
        }
      }
    }


    const response = await OpenAIStream(
      OpenAIModels['gpt-4o-mini'],
      systemPrompt,
      0.1,
      llmProviders,
      messages,
      false,
    )

    return res.status(200).json(response)
  } catch (error) {
    if (error instanceof OpenAIError) {
      const { name, message } = error
      console.error('OpenAI Completion Error', message)
      return res.status(400).json({
        statusCode: 400,
        name: name,
        message: message,
      })
    } else {
      console.error('Unexpected Error', error)
      return res.status(500).json({ name: 'Error' })
    }
  }
}

export default handler

export function getImageDescriptionSystemPrompt() {
  return `"Analyze and describe the given image with relevance to the user query, focusing solely on visible elements. Detail the image by:
	- Identifying text (OCR information), objects, spatial relationships, colors, actions, annotations, and labels.
	- Utilizing specific terminology relevant to the image's domain (e.g., medical, agricultural, technological).
	- Categorizing the image and listing associated key terms.
	- Summarizing with keywords or phrases reflecting the main themes based on the user query.
	
	Emphasize primary features before detailing secondary elements. For abstract or emotional content, infer the central message. Provide synonyms for technical terms where applicable. 
	Ensure the description remains concise, precise and relevant for semantic retrieval, avoiding mention of non-present features. Don't be redundant or overly verbose as that may hurt the semantic retrieval."
	
	**Goal:** Create an accurate, focused description that enhances semantic document retrieval of the user query, using ONLY observable details in the form of keywords`
}
