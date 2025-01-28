import { type NextApiRequest, type NextApiResponse } from 'next'
import { supabase } from '~/utils/supabaseClient'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { document_ids } = req.body

    if (!document_ids || !Array.isArray(document_ids)) {
      return res.status(400).json({ error: 'Invalid document_ids parameter' })
    }

    // Get document statuses from Supabase
    const { data, error } = await supabase
      .from('cedar_documents')
      .select('id, metadata_status, last_error')
      .in('id', document_ids)

    if (error) {
      throw error
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('Error getting document statuses:', error)
    return res.status(500).json({ error: 'Failed to get document statuses' })
  }
}
