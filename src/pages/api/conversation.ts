import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/utils/supabaseClient'
import {
  Conversation as ChatConversation,
  Message as ChatMessage,
  Content,
  ContextWithMetadata,
  Role,
  UIUCTool,
} from '@/types/chat'
import { Database } from 'database.types'
import { v4 as uuidv4 } from 'uuid'
import { AllSupportedModels, GenericSupportedModel } from '~/types/LLMProvider'

type DBConversation = Database['public']['Tables']['conversations']['Row']
type DBMessage = Database['public']['Tables']['messages']['Row']

export function convertChatToDBConversation(
  chatConversation: ChatConversation,
): DBConversation {
  return {
    id: chatConversation.id,
    name: chatConversation.name,
    model: chatConversation.model.id,
    prompt: chatConversation.prompt,
    temperature: chatConversation.temperature,
    user_email: chatConversation.userEmail || null,
    project_name: chatConversation.projectName || '',
    folder_id: chatConversation.folderId || null,
    created_at: new Date().toISOString(), // Assuming current time for new records
    updated_at: new Date().toISOString(), // Assuming current time for new records
  }
}

export function convertDBToChatConversation(
  dbConversation: DBConversation,
  dbMessages: DBMessage[],
): ChatConversation {
  return {
    id: dbConversation.id,
    name: dbConversation.name,
    model: Array.from(AllSupportedModels).find(
      (model) => model.id === dbConversation.model,
    ) as GenericSupportedModel,
    prompt: dbConversation.prompt,
    temperature: dbConversation.temperature,
    userEmail: dbConversation.user_email || undefined,
    projectName: dbConversation.project_name,
    folderId: dbConversation.folder_id,
    messages: dbMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as Role,
      content: msg.content as string | Content[],
      contexts: msg.contexts as ContextWithMetadata[] | [],
      tools: msg.tools as UIUCTool[] | [],
      latestSystemMessage: msg.latest_system_message as string,
      finalPromtEngineeredMessage:
        msg.final_prompt_engineered_message as string,
      responseTimeSec: msg.response_time_sec as number,
    })),
  }
}

export function convertChatToDBMessage(
  chatMessage: ChatMessage,
  conversationId: string,
): DBMessage {
  return {
    id: chatMessage.id || uuidv4(),
    role: chatMessage.role,
    content: chatMessage.content as any,
    contexts:
      chatMessage.contexts?.map((context, index) => {
        if (context.s3_path) {
          return { s3_path_chunk_index: context.s3_path + index }
        } else if (context.url) {
          return { url_chunk_index: context.url + index }
        } else {
          return {}
        }
      }) || [],
    tools: chatMessage.tools || (null as any),
    latest_system_message: chatMessage.latestSystemMessage || null,
    final_prompt_engineered_message:
      chatMessage.finalPromtEngineeredMessage || null,
    response_time_sec: chatMessage.responseTimeSec || null,
    conversation_id: conversationId,
    created_at: new Date().toISOString(), // Assuming current time for new records
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log(
    'Received request for conversation API:',
    req.method,
    req.body,
    req.query,
  )
  const { method } = req

  switch (method) {
    case 'POST':
      const {
        emailAddress,
        conversation,
      }: { emailAddress: string; conversation: ChatConversation } = req.body
      try {
        // Convert conversation to DB type
        const dbConversation = convertChatToDBConversation(conversation)
        console.log(
          'Saving conversation to server with db object:',
          dbConversation,
        )

        // Save conversation to Supabase
        const { data, error } = await supabase
          .from('conversations')
          .upsert([dbConversation], { onConflict: 'id' })

        if (error) throw error

        // Convert and save messages
        for (const message of conversation.messages) {
          const dbMessage = convertChatToDBMessage(message, conversation.id)
          await supabase.from('messages').upsert(dbMessage)
        }

        res.status(200).json({ message: 'Conversation saved successfully' })
      } catch (error) {
        res
          .status(500)
          .json({ error: `Error saving conversation` + error?.toString() })
        console.error('Error saving conversation:', error)
      }
      break

    case 'GET':
      const { user_email } = req.query
      try {
        if (!user_email || typeof user_email !== 'string') {
          res.status(400).json({ error: 'No valid email address provided' })
          return
        }

        const { data, error } = await supabase
          .from('conversations')
          .select(
            `
              *,
              messages (
                id,
                role,
                content,
                contexts,
                tools,
                latest_system_message,
                final_prompt_engineered_message,
                response_time_sec,
                conversation_id,
                created_at
              )
            `,
          )
          .eq('user_email', user_email)
          .order('updated_at', { ascending: false })
          .limit(10)

        if (error) throw error
        console.log('Fetched conversations before conversion:', data)

        const fetchedConversations = data.map((conv) => {
          const convMessages = conv.messages
          return convertDBToChatConversation(conv, convMessages)
        })
        console.log('Fetched conversations:', fetchedConversations)
        res.status(200).json(fetchedConversations)
      } catch (error) {
        res.status(500).json({ error: 'Error fetching conversation history' })
      }
      break

    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
