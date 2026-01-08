import type { NextApiRequest, NextApiResponse } from 'next';
import { getSkillsContent, SkillsContent } from '@/lib/content';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SkillsContent | { error: string }>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const content = await getSkillsContent();
        res.status(200).json(content);
    } catch (error) {
        console.error('Error loading skills content:', error);
        res.status(500).json({ error: 'Failed to load content' });
    }
}
