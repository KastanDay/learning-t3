import { ContextWithMetadata } from '~/types/chat'

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json'
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init'
import { extractEmailsFromClerk } from '~/components/UIUC-Components/clerkHelpers'
import { type CourseMetadata } from '~/types/courseMetadata'
import { useUser } from '@clerk/nextjs'
import router from 'next/router'
import { getCoursesByOwnerOrAdmin } from './UIUC-api/getAllCourseMetadata'
import { getCourseMetadata } from './UIUC-api/getCourseMetadata'

export async function getSystemPrompt(course_name: string) {
  const course_data = await getCourseMetadata(course_name)
  const systemPrompt = course_data?.system_prompt

  let prePrompt = `Please analyze and respond to the following question using the excerpts from the provided documents. These documents can be pdf files or web pages.
    Integrate relevant information from these documents, ensuring each reference is linked to the document's number.
    Your response should be semi-formal. 
    When quoting directly, cite with footnotes linked to the document number and page number, if provided. 
    Summarize or paraphrase other relevant information with inline citations, again referencing the document number and page number, if provided.
    If the answer is not in the provided documents, state so. 
    Conclude your response with a LIST of the document titles as clickable placeholders, each linked to its respective document number and page number, if provided.
    Always share page numbers if they were shared with you.
    ALWAYS follow the examples below:
    Insert an inline citation like this in your response: 
    "[1]" if you're referencing the first document or 
    "[1, page: 2]" if you're referencing page 2 of the first document.
    At the end of your response, list the document title with a clickable link, like this: 
    "1. [document_name](#)" if you're referencing the first document or
    "1. [document_name, page: 2](#)" if you're referencing page 2 of the first document.
    Nothing else should prefixxed or suffixed to the citation or document name. Consecutive citations should be separated by a comma.
    
    Suppose a document name is shared with you along with the index and pageNumber below like "27: www.pdf, page: 2", "28: www.osd", "29: pdf.www, page 11\n15" where 27, 28, 29 are indices, www.pdf, www.osd, pdf.www are document_name, and 2, 11 are the pageNumbers and 15 is the content of the document, then inline citations and final list of cited documents should ALWAYS be in the following format:
    """
    The sky is blue. [27, page: 2][28] The grass is green. [29, page: 11]
    Relevant Sources:

    27. [www.pdf, page: 2](#)
    28. [www.osd](#)
    29. [pdf.www, page: 11](#)
    """
    ONLY return the documents with relevant information and cited in the response. If there are no relevant sources, don't include the "Relevant Sources" section in response.
    Here are excerpts from the high-quality documents provided:
    \n"`

  // Law school "closed world" question answering
  if (course_name == 'Law794-TransactionalDraftingAlam') {
    const lawPreprompt =
      'This is for the law domain and we train law students to stick to facts that are in the record. Do not improvise or use your world knowledge, stick to only the information provided and make heavy use of direct quotes instead of paraphrasing or summarizing.\n'
    prePrompt = lawPreprompt + prePrompt
  }

  return (
    systemPrompt + prePrompt + '\n\nNow please respond to my conversation: '
  )
}

export async function getStuffedPrompt(
  course_name: string,
  searchQuery: string,
  contexts: ContextWithMetadata[],
  tokenLimit = 8000,
  system_prompt: string,
) {
  try {
    if (contexts.length === 0) {
      return searchQuery
    }

    tokenLimit = tokenLimit - 1500 // for the completion. We always reserve 1k + some for the system prompt I think...

    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    )

    let tokenCounter = encoding.encode(system_prompt + searchQuery).length
    const validDocs = []
    for (const [index, d] of contexts.entries()) {
      const docString = `---\n${index + 1}: ${d.readable_filename}${
        d.pagenumber ? ', page: ' + d.pagenumber : ''
      }\n${d.text}\n`
      const numTokens = encoding.encode(docString).length
      // console.log(
      //   `token_counter: ${tokenCounter}, num_tokens: ${numTokens}, token_limit: ${tokenLimit}`,
      // )
      if (tokenCounter + numTokens <= tokenLimit) {
        tokenCounter += numTokens
        validDocs.push({ index, d })
      } else {
        continue
      }
    }

    const separator = '---\n' // between each context
    const contextText = validDocs
      .map(
        ({ index, d }) =>
          `${index + 1}: ${d.readable_filename}${
            d.pagenumber ? ', page: ' + d.pagenumber : ''
          }\n${d.text}\n`,
      )
      .join(separator)

    const stuffedPrompt =
      contextText + '\n\nNow please respond to my query: ' + searchQuery
    const totalNumTokens = encoding.encode(stuffedPrompt).length
    // console.log('Stuffed prompt', stuffedPrompt.substring(0, 3700))
    // console.log(
    // `Total number of tokens: ${totalNumTokens}. Number of docs: ${contexts.length}, number of valid docs: ${validDocs.length}`,
    // )

    return stuffedPrompt
  } catch (e) {
    console.error(`Error in getStuffedPrompt: ${e}`)
    throw e
  }
}
