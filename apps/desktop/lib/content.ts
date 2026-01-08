import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

// Types
export interface AboutContent {
    name: string;
    title: string;
    location: string;
    email: string;
    phone?: string;
    contentHtml: string;
}

export interface ExperienceEntry {
    slug: string;
    title: string;
    role: string;
    dateRange: string;
    order: number;
    type: 'work' | 'community';
    contentHtml: string;
}

export interface SkillCategory {
    name: string;
    skills: { name: string; icon: string }[];
}

export interface SkillsContent {
    categories: SkillCategory[];
}

// Content directory path
const contentDirectory = path.join(process.cwd(), 'content');

/**
 * Get and parse about.md content
 */
export async function getAboutContent(): Promise<AboutContent> {
    const fullPath = path.join(contentDirectory, 'about.md');
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    const { data, content } = matter(fileContents);

    const processedContent = await remark()
        .use(html)
        .process(content);

    return {
        name: data.name || 'Unknown',
        title: data.title || '',
        location: data.location || '',
        email: data.email || '',
        phone: data.phone,
        contentHtml: processedContent.toString(),
    };
}

/**
 * Get all experience entries sorted by order
 */
export async function getExperienceEntries(): Promise<ExperienceEntry[]> {
    const experienceDir = path.join(contentDirectory, 'experience');
    const fileNames = fs.readdirSync(experienceDir);

    const entries = await Promise.all(
        fileNames
            .filter((fileName) => fileName.endsWith('.md'))
            .map(async (fileName) => {
                const slug = fileName.replace(/\.md$/, '');
                const fullPath = path.join(experienceDir, fileName);
                const fileContents = fs.readFileSync(fullPath, 'utf8');

                const { data, content } = matter(fileContents);

                const processedContent = await remark()
                    .use(html)
                    .process(content);

                return {
                    slug,
                    title: data.title || slug,
                    role: data.role || '',
                    dateRange: data.dateRange || '',
                    order: data.order || 999,
                    type: data.type || 'work',
                    contentHtml: processedContent.toString(),
                } as ExperienceEntry;
            })
    );

    // Sort by order
    return entries.sort((a, b) => a.order - b.order);
}

/**
 * Get skills content
 */
export async function getSkillsContent(): Promise<SkillsContent> {
    const fullPath = path.join(contentDirectory, 'skills.md');
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    const { data } = matter(fileContents);

    return {
        categories: data.categories || [],
    };
}

/**
 * Get a single experience entry by slug
 */
export async function getExperienceBySlug(slug: string): Promise<ExperienceEntry | null> {
    const entries = await getExperienceEntries();
    return entries.find((entry) => entry.slug === slug) || null;
}
