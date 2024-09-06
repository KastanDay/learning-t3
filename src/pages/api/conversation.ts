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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
}
export type DBConversation =
  Database['public']['Tables']['conversations']['Row']
export type DBMessage = Database['public']['Tables']['messages']['Row']

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
    created_at: chatConversation.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    messages: (dbMessages || []).map((msg) => {
      const content: Content[] = []
      if (msg.content_text) {
        content.push({
          type: 'text',
          text: msg.content_text,
        })
      }
      if (msg.content_image_url && msg.content_image_url.length > 0) {
        for (const imageUrl of msg.content_image_url) {
          content.push({
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          })
        }
      }

      return {
        id: msg.id,
        role: msg.role as Role,
        content: content,
        contexts: (msg.contexts as any as ContextWithMetadata[]) || [],
        tools: (msg.tools as any as UIUCTool[]) || [],
        latestSystemMessage: msg.latest_system_message || undefined,
        finalPromtEngineeredMessage:
          msg.final_prompt_engineered_message || undefined,
        responseTimeSec: msg.response_time_sec || undefined,
        created_at: msg.created_at || undefined,
        updated_at: msg.updated_at || undefined,
      }
    }),
  }
}

export function convertChatToDBMessage(
  chatMessage: ChatMessage,
  conversationId: string,
): DBMessage {
  console.log('chatMessage.content: ', chatMessage.content)
  console.log('chatMessage.content type: ', typeof chatMessage.content)
  let content_text = ''
  let content_image_urls: string[] = []

  if (typeof chatMessage.content == 'string') {
    content_text = chatMessage.content
  } else if (Array.isArray(chatMessage.content)) {
    content_text = chatMessage.content
      .filter((content) => content.type === 'text')
      .map((content) => content.text)
      .join(' ')
    content_image_urls = chatMessage.content
      .filter((content) => content.type === 'image_url')
      .map((content) => content.image_url?.url || '')
  }

  return {
    id: chatMessage.id || uuidv4(),
    role: chatMessage.role,
    content_text: content_text,
    content_image_url: content_image_urls,
    contexts:
      chatMessage.contexts?.map((context, index) => {
        // TODO:
        // This is where we will put context_id in the future
        // console.log('context: ', context)
        if (context.s3_path) {
          return { chunk_index: context.s3_path + '_' + index }
        } else if (context.url) {
          return { url_chunk_index: context.url + '_' + index }
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
    created_at: chatMessage.created_at || new Date().toISOString(),
    updated_at: chatMessage.updated_at || new Date().toISOString(),
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
      const user_email = req.query.user_email as string
      const searchTerm = req.query.searchTerm as string
      const courseName = req.query.courseName as string
      const pageParam = parseInt(req.query.pageParam as string, 0)
      // Search term is optional
      if (!user_email || !courseName || isNaN(pageParam)) {
        console.log('first boolean:', !user_email)
        console.log('second boolean:', !searchTerm)
        console.log('third boolean:', !courseName)
        console.log('fourth boolean:', isNaN(pageParam))
        console.log('Invalid query parameters:', req.query)
        res.status(400).json({ error: 'Invalid query parameters' })
        return
      }

      try {
        const pageSize = 8

        let query = supabase
          .from('conversations')
          .select(
            `
            *,
            messages (
              id,
              role,
              content_text,
              content_image_url,
              contexts,
              tools,
              latest_system_message,
              final_prompt_engineered_message,
              response_time_sec,
              conversation_id,
              created_at
            )
          `,
            { count: 'exact' },
          )
          .eq('user_email', user_email)
          .eq('project_name', courseName)
          // .or(`content_text.ilike.%${searchTerm}%`, { foreignTable : 'messages'})
          // .or(`messages.content_text.ilike.%${searchTerm}%`)
          .is('folder_id', null)

        // Add search condition only if searchTerm is provided
        if (searchTerm) {
          // query = query.or(`name.ilike.%${searchTerm}%`).or(`content_text.ilike.%${searchTerm}%`, { foreignTable : 'messages'})
          // query = query.or(`messages.content_text.ilike.%${searchTerm}%`)
          query = query.or(`name.ilike.%${searchTerm}%`)
          // query.filter('messages.content_text', 'ilike', `%${searchTerm}%`) // Filter on the message content in the related table
          query = query.or(`content_text.ilike.%${searchTerm}%`, {
            foreignTable: 'messages',
          })
          // .or(`name.ilike.%${searchTerm}%`)
          // query = query.textSearch('content_text', `%${searchTerm}%`, { type : 'plain'}, { foreignTable : 'messages'})
        }
        console.log('query: ', query)

        const rangeStart = pageParam * pageSize
        const rangeEnd = (pageParam + 1) * pageSize - 1
        console.log('Range:', { rangeStart, rangeEnd })

        const { data, count, error } = await query
          .order('updated_at', { ascending: false })
          .order('updated_at', { foreignTable: 'messages', ascending: true })
          .limit(pageSize)
          .range(rangeStart, rangeEnd)

        if (error) {
          console.error(
            'Error fetching conversation history in sql query:',
            error,
          )
          throw error
        }
        // console.log(
        //   'Fetched conversations before conversion in /conversation:',
        //   data,
        // )

        const fetchedConversations = (data || []).map((conv) => {
          // console.log('Fetched conversation:', conv)
          const convMessages = conv.messages || []
          return convertDBToChatConversation(conv, convMessages)
        })

        const nextCursor =
          count && count > (pageParam + 1) * pageSize ? pageParam + 1 : null

        console.log(
          'Fetched conversations:',
          fetchedConversations.length,
          'for user_email:',
          user_email,
        )
        res.status(200).json({
          conversations: fetchedConversations,
          nextCursor: nextCursor,
        })
      } catch (error) {
        res.status(500).json({ error: 'Error fetching conversation history' })
        console.error('Error fetching conversation history:', error)
      }
      break

    case 'DELETE':
      const { id } = req.body as {
        id: string
      }
      try {
        // Delete conversation
        const { data, error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', id)
        if (error) throw error

        res.status(200).json({ message: 'Conversation deleted successfully' })
      } catch (error) {
        res.status(500).json({ error: 'Error deleting conversation' })
        console.error('Error deleting conversation:', error)
      }
      break

    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
