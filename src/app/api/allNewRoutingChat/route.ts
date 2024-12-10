// src/app/api/allNewRoutingChat/route.ts

import { ChatBody, Conversation } from '@/types/chat'
import { routeModelRequest } from '~/utils/streamProcessing'
import { NextRequest, NextResponse } from 'next/server'
import { buildPrompt } from '~/app/utils/buildPromptUtils'
import { OpenAIError } from '~/utils/server'

export async function POST(req: NextRequest, res: NextResponse) {
  const startTime = Date.now()
  const { searchParams } = new URL(req.url)
  const summary = searchParams.get('summary') === 'true'

  const body = await req.json()

  const {
    conversation,
    // key,
    course_name,
    courseMetadata,
    // stream,
    // llmProviders,
  } = body as ChatBody

  const buildPromptStartTime = Date.now()
  let newConversation: Conversation

  if (summary) {
    // call LLM for summarized conversation
    const buildPromptStartTime = Date.now()
    // const summaryConversation: Conversation = {
    //   ...conversation,
    //   messages: [
    //     {
    //       id: uuidv4(),
    //       role: 'user',
    //       latestSystemMessage: 'You are a helpful assistant that summarizes content. Summarize the content within 3 sentences',
    //       content: conversation?.messages
    //           .filter(msg => msg.role === 'assistant')
    //           .slice(-1)[0]?.content || '',
    //       finalPromtEngineeredMessage: conversation?.messages
    //     },
    //   ],
    // }
    newConversation = await buildPrompt({
      conversation,
      projectName: course_name,
      courseMetadata,
      summary: true,
    })
  } else {
    // buildPrompt if not calling LLM for summarized conversation
    newConversation = await buildPrompt({
      conversation,
      projectName: course_name,
      courseMetadata,
      summary: false,
    })
  }
  body.conversation = newConversation
  const buildPromptEndTime = Date.now()
  const buildPromptDuration = buildPromptEndTime - buildPromptStartTime
  console.log(`buildPrompt duration: ${buildPromptDuration}ms`)

  try {
    console.log('body conversation', body.conversation)
    const result = await routeModelRequest(body as ChatBody)

    const endTime = Date.now()
    const duration = endTime - startTime
    console.log(`Total duration: ${duration}ms`)

    return result
  } catch (error) {
    console.error('Error in routeModelRequest:', error)

    let errorMessage = 'An unexpected error occurred'
    let statusCode = 500

    if (error instanceof OpenAIError) {
      statusCode = parseInt(error.code || '500')
      errorMessage = error.message
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        code: statusCode,
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
