// ChatMessage.tsx
import { Text, Group } from '@mantine/core'
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconRobot,
  IconTrash,
  IconUser,
} from '@tabler/icons-react'
import { FC, memo, useContext, useEffect, useRef, useState } from 'react'

import { useTranslation } from 'next-i18next'
import { updateConversation } from '@/utils/app/conversation'
import { ContextWithMetadata, Message } from '@/types/chat'
import HomeContext from '~/pages/api/home/home.context'
import { CodeBlock } from '../Markdown/CodeBlock'
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown'

import rehypeMathjax from 'rehype-mathjax'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { ContextCards } from '~/components/UIUC-Components/ContextCards'

// Component that's the Timer for GPT's response duration.
const Timer: React.FC<{ timerVisible: boolean }> = ({ timerVisible }) => {
  const [timer, setTimer] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerVisible) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1)
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [timerVisible])

  return timer > 0 ? (
    <Text fz="sm" c="dimmed" mt="sm">
      {timer} s.
    </Text>
  ) : (
    <></>
  )
}

export interface Props {
  message: Message
  messageIndex: number
  onEdit?: (editedMessage: Message) => void
  context?: ContextWithMetadata[]
}

export const ChatMessage: FC<Props> = memo(
  ({ message, messageIndex, onEdit }) => {
    const { t } = useTranslation('chat')

    const {
      state: {
        selectedConversation,
        conversations,
        currentMessage,
        messageIsStreaming,
      },
      dispatch: homeDispatch,
    } = useContext(HomeContext)

    const [isEditing, setIsEditing] = useState<boolean>(false)
    const [isTyping, setIsTyping] = useState<boolean>(false)
    const [messageContent, setMessageContent] = useState(message.content)
    const [messagedCopied, setMessageCopied] = useState(false)

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // SET TIMER for message writing (from gpt-4)
    const [timerVisible, setTimerVisible] = useState(false)
    useEffect(() => {
      if (message.role === 'assistant') {
        if (
          messageIsStreaming &&
          messageIndex == (selectedConversation?.messages.length ?? 0) - 1
        ) {
          setTimerVisible(true)
        } else {
          setTimerVisible(false)

          // save time to Message
          // const updatedMessages: Message[] =
          //   selectedConversation?.messages.map((message, index) => {
          //     if (index === messageIndex) {
          //       return {
          //         ...message,
          //         responseTimeSec: Timer.timer as number, // todo: get the timer value out of that component.
          //       }
          //     }
          //     return message
          //   })
          // const updatedConversation = {
          //   ...updatedConversation,
          //   messages: updatedMessages,
          // }
          // homeDispatch({
          //   field: 'selectedConversation',
          //   value: updatedConversation,
          // })
        }
      }
    }, [message.role, messageIsStreaming, messageIndex, selectedConversation])

    const toggleEditing = () => {
      setIsEditing(!isEditing)
    }

    const handleInputChange = (
      event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setMessageContent(event.target.value)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit'
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }

    const handleEditMessage = () => {
      if (message.content != messageContent) {
        if (selectedConversation && onEdit) {
          onEdit({ ...message, content: messageContent })
        }
      }
      setIsEditing(false)
    }

    const handleDeleteMessage = () => {
      if (!selectedConversation) return

      const { messages } = selectedConversation
      const findIndex = messages.findIndex((elm) => elm === message)

      if (findIndex < 0) return

      if (
        findIndex < messages.length - 1 &&
        messages[findIndex + 1]?.role === 'assistant'
      ) {
        messages.splice(findIndex, 2)
      } else {
        messages.splice(findIndex, 1)
      }
      const updatedConversation = {
        ...selectedConversation,
        messages,
      }

      const { single, all } = updateConversation(
        updatedConversation,
        conversations,
      )
      homeDispatch({ field: 'selectedConversation', value: single })
      homeDispatch({ field: 'conversations', value: all })
    }

    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
        e.preventDefault()
        handleEditMessage()
      }
    }

    const copyOnClick = () => {
      if (!navigator.clipboard) return

      navigator.clipboard.writeText(message.content).then(() => {
        setMessageCopied(true)
        setTimeout(() => {
          setMessageCopied(false)
        }, 2000)
      })
    }

    useEffect(() => {
      // setMessageContent(message.content)
      console.log('IN ChatMessage 189 adding hi to messages: ', message)
      setMessageContent(`${message.content} hi`)

      // RIGHT HERE, run context search.

      // WARNING! Kastan trying to set message context.
      // console.log('IN handleSend: ', message)
      // if (message.role === 'user') {
      //   buildContexts(message.content)
      // }
    }, [message.content])

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit'
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, [isEditing])

    return (
      <div
        className={`group md:px-4 ${message.role === 'assistant'
          ? 'border-b border-black/10 bg-gray-50/50 text-gray-800 dark:border-[rgba(42,42,120,0.50)] dark:bg-[#202134] dark:text-gray-100'
          : 'border-b border-black/10 bg-white/50 text-gray-800 dark:border-[rgba(42,42,120,0.50)] dark:bg-[#15162B] dark:text-gray-100'
          }`}
        style={{ overflowWrap: 'anywhere' }}
      >
        <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-5xl lg:px-0 xl:max-w-3xl">
          <div className="min-w-[40px] text-left">
            {message.role === 'assistant' ? (
              <>
                <IconRobot size={30} />
                <Timer timerVisible={timerVisible} />
              </>
            ) : (
              <IconUser size={30} />
            )}
          </div>

          <div className="dark:prose-invert prose mt-[-2px] w-full">
            {message.role === 'user' ? (
              <div className="flex w-full">
                {isEditing ? (
                  <div className="flex w-full flex-col">
                    <textarea
                      ref={textareaRef}
                      className="w-full resize-none whitespace-pre-wrap border-none dark:bg-[#343541]"
                      value={messageContent}
                      onChange={handleInputChange}
                      onKeyDown={handlePressEnter}
                      onCompositionStart={() => setIsTyping(true)}
                      onCompositionEnd={() => setIsTyping(false)}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        padding: '0',
                        margin: '0',
                        overflow: 'hidden',
                      }}
                    />

                    <div className="mt-10 flex justify-center space-x-4">
                      <button
                        className="h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50"
                        onClick={handleEditMessage}
                        disabled={messageContent.trim().length <= 0}
                      >
                        {t('Save & Submit')}
                      </button>
                      <button
                        className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        onClick={() => {
                          setMessageContent(message.content)
                          setIsEditing(false)
                        }}
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="dark:prose-invert prose flex-1 whitespace-pre-wrap">
                    {message.content}
                  </div>
                )}

                {!isEditing && (
                  <div className="ml-1 flex flex-col items-center justify-end gap-4 md:-mr-8 md:ml-0 md:flex-row md:items-start md:justify-start md:gap-1">
                    <button
                      className="invisible text-gray-500 hover:text-gray-700 focus:visible group-hover:visible dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={toggleEditing}
                    >
                      <IconEdit size={20} />
                    </button>
                    <button
                      className="invisible text-gray-500 hover:text-gray-700 focus:visible group-hover:visible dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={handleDeleteMessage}
                    >
                      <IconTrash size={20} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-row">
                <div className="flex-1">
                  <MemoizedReactMarkdown
                      className="dark:prose-invert prose flex-1 linkMarkDown data-footnote-backref data-footnotes"
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeMathjax]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        if (children.length) {
                          if (children[0] == '▍') {
                            return (
                              <span className="mt-1 animate-pulse cursor-default">
                                ▍
                              </span>
                            )
                          }

                          children[0] = (children[0] as string).replace(
                            '`▍`',
                            '▍',
                          )
                        }

                        const match = /language-(\w+)/.exec(className || '')

                        return !inline ? (
                          <CodeBlock
                            key={Math.random()}
                            language={(match && match[1]) || ''}
                            value={String(children).replace(/\n$/, '')}
                            {...props}
                          />
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      },
                      table({ children }) {
                        return (
                          <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                            {children}
                          </table>
                        )
                      },
                      th({ children }) {
                        return (
                          <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                            {children}
                          </th>
                        )
                      },
                      td({ children }) {
                        return (
                          <td className="break-words border border-black px-3 py-1 dark:border-white">
                            {children}
                          </td>
                        )
                      },
                      link({ node, className, children, ...props }) {
                        const { href, title } = props;
                        return (

                          <a
                              id="styledLink"
                            href={href}
                            target="_blank"
                            title={title}
                            rel="noopener noreferrer"
                              className="linkMarkDown"
                          >
                            {children}
                          </a>

                        )
                      },
                    }}
                  >
                      {`${message.content}${messageIsStreaming &&
                      messageIndex ==
                      (selectedConversation?.messages.length ?? 0) - 1
                      ? '`▍`'
                      : ''
                      }`}
                  </MemoizedReactMarkdown>
                    {/* {message.contexts && message.contexts.length > 0 && (
                    <Group variant="row" spacing="xs">
                      <ContextCards contexts={message.contexts} />
                    </Group>
                  )} */}
                </div>

                <div className="ml-1 flex flex-col items-center justify-end gap-4 md:-mr-8 md:ml-0 md:flex-row md:items-start md:justify-start md:gap-1">
                  {messagedCopied ? (
                    <IconCheck
                      size={20}
                      className="text-green-500 dark:text-green-400"
                    />
                  ) : (
                    <button
                      className="invisible text-gray-500 hover:text-gray-700 focus:visible group-hover:visible dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={copyOnClick}
                    >
                      <IconCopy size={20} />
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* {message.role === 'assistant' && <Timer timerVisible={timerVisible} />} */}
          </div>
        </div>
      </div>
    )
  },
)
ChatMessage.displayName = 'ChatMessage'
