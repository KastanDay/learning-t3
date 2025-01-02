import { type NextApiRequest, type NextApiResponse } from 'next'
import { supabase } from '~/utils/supabaseClient'


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const startTime = Date.now()
    try {

        const queryStartTime = Date.now()
        const { data, error } = await supabase
            .from('maintenance-mode')
            .select('is_maintenance_mode_active')
            .single()

        console.log(`[getMaintenanceMode] Supabase query took ${Date.now() - queryStartTime}ms`)

        if (error) throw error

        res.status(200).json({
            isMaintenanceMode: data.is_maintenance_mode_active
        })
    } catch (error) {
        console.error('[getMaintenanceMode] Failed to check maintenance mode:', error)
        res.status(500).json({ error: 'Failed to check maintenance mode' })
        console.log(`[getMaintenanceMode] Failed request took ${Date.now() - startTime}ms`)
    }
}