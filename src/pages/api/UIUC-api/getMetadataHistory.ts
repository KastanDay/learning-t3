import { type NextApiRequest, type NextApiResponse } from 'next'
import { supabase } from '~/utils/supabaseClient'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { course_name } = req.query

  if (!course_name) {
    return res.status(400).json({ error: 'Course name is required' })
  }

  try {
    // First get the document IDs for the course
    const { data: documents, error: docError } = await supabase
      .from('cedar_documents')
      .select('id')
      .eq('course_name', course_name)

    if (docError) {
      console.error('Error fetching document IDs:', docError)
      return res.status(500).json({ error: 'Failed to fetch documents' })
    }

    const documentIds = documents.map((doc) => doc.id)

    // Get distinct run_ids and their metadata
    const { data: metadata, error } = await supabase
      .from('cedar_document_metadata')
      .select(
        `
        id,
        created_at,
        run_id,
        field_name,
        field_value,
        document_id
      `,
      )
      .in('document_id', documentIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching metadata:', error)
      return res.status(500).json({ error: 'Failed to fetch history' })
    }

    // Group metadata by run_id
    const groupedHistory = metadata.reduce((acc: any[], item) => {
      if (!item.run_id) return acc

      const existingRun = acc.find((r) => r.run_id === item.run_id)

      if (existingRun) {
        // Count unique document_ids for this run
        if (!existingRun.document_ids.includes(item.document_id)) {
          existingRun.document_ids.push(item.document_id)
          existingRun.document_count = existingRun.document_ids.length
        }
        // Get prompt if this is a prompt field
        if (item.field_name === 'prompt') {
          try {
            existingRun.prompt =
              typeof item.field_value === 'string'
                ? item.field_value
                : JSON.stringify(item.field_value)
          } catch (e) {
            console.error('Error parsing prompt:', e)
          }
        }
      } else {
        let prompt = ''
        if (item.field_name === 'prompt') {
          try {
            prompt =
              typeof item.field_value === 'string'
                ? item.field_value
                : JSON.stringify(item.field_value)
          } catch (e) {
            console.error('Error parsing prompt:', e)
          }
        }
        acc.push({
          run_id: item.run_id,
          timestamp: item.created_at,
          prompt,
          status: 'completed', // Since we have metadata, it must be completed
          document_ids: [item.document_id],
          document_count: 1,
        })
      }
      return acc
    }, [])

    // Sort by timestamp descending and limit to 50 runs
    const sortedHistory = groupedHistory
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 50)

    return res.status(200).json({ history: sortedHistory })
  } catch (error) {
    console.error('Error in getMetadataHistory:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
