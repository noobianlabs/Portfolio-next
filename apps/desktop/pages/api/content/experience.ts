import type { NextApiRequest, NextApiResponse } from 'next';
import { getExperienceEntries, ExperienceEntry } from '@/lib/content';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ExperienceEntry[] | { error: string }>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const entries = await getExperienceEntries();
        res.status(200).json(entries);
    } catch (error) {
        console.error('Error loading experience content:', error);
        res.status(500).json({ error: 'Failed to load content' });
    }
}
