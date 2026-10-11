export type ProjectGroup = 'engineering' | 'community';
export type ProjectFilter = ProjectGroup | 'all';

export interface PublicProject {
  id: string;
  group: ProjectGroup;
  category: string;
  title: string;
  noteTitle: string;
  status: string;
  source: string;
  sourceLabel?: string;
  summary: string;
  tags: string;
  role: string;
  notes: readonly string[];
  extraSource?: { href: string; label: string };
}

const sourceRoot = 'https://github.com/noobianlabs/Portfolio-next/blob/main/';

// Publication-safe copy drawn only from the linked, already-public portfolio.
// Status labels describe the contribution, not a currently deployed product.
export const publicProjects: readonly PublicProject[] = [
  {
    id: 'habibi-tech',
    group: 'community',
    category: 'DEVELOPER ADVOCACY',
    title: 'Habibi Tech demos',
    noteTitle: 'Habibi Tech',
    status: 'Demos & learning',
    source: `${sourceRoot}apps/desktop/content/experience/habibi-tech.md`,
    summary: 'Hands-on demos for building with large language models and retrieval-augmented generation, alongside community discussions and collaborative Demo Days.',
    tags: 'Python · RAG · Hugging Face · Gradio',
    role: 'Developer advocacy',
    notes: [
      'I developed and presented demos for large language models and retrieval-augmented generation, using Python, Hugging Face, and Gradio.',
      'Alongside the code, I facilitated community discussions and collaborative Demo Days: practical settings for people to learn and build together.',
    ],
  },
  {
    id: 'cvs-health',
    group: 'engineering',
    category: 'ENGINEERING & APPLIED AI',
    title: 'CVS AI/ML prototypes',
    noteTitle: 'CVS Health',
    status: 'Prototype contributions',
    source: `${sourceRoot}apps/desktop/content/experience/cvs-health.md`,
    summary: 'Explorations in knowledge retrieval and meeting summarization, with feature development across Spring Boot and Next.js teams.',
    tags: 'Next.js · Spring Boot · Ollama · Llama Index',
    role: 'Software engineering · 2023–2024',
    notes: [
      'I supported AI/ML prototypes for knowledge retrieval and meeting summarization, including explorations of retrieval-augmented generation and prompt engineering.',
      'Across backend and frontend rotations, I contributed to features and maintenance, behavior-driven tests, and accessibility fixes. The work spanned Spring Boot, Stencil, and Next.js, with Ollama and Llama Index among the AI tools.',
    ],
  },
  {
    id: 'for-our-liberation',
    group: 'community',
    category: 'COMMUNITY TECHNOLOGY',
    title: 'For Our Liberation',
    noteTitle: 'For Our Liberation',
    status: 'Website & programs',
    source: `${sourceRoot}apps/desktop/content/experience/for-our-liberation.md`,
    summary: 'Website development and maintenance supporting mutual aid in Brooklyn, alongside community programs, skillshares, and collective learning.',
    tags: 'Web development · Community organizing',
    role: 'Web development & community programs · 2021–2024',
    notes: [
      'I developed and maintained the organization’s website alongside mutual-aid work in Brooklyn.',
      'The broader practice included skillshares, film screenings, discussions, and community programs. The public project record identifies Next.js and React as website tools.',
    ],
    extraSource: {
      href: `${sourceRoot}apps/desktop/applications/About/Projects.tsx#L232-L255`,
      label: 'Public website project record',
    },
  },
  {
    id: 'ibm-maximo',
    group: 'engineering',
    category: 'DATA SCIENCE',
    title: 'IBM Maximo',
    noteTitle: 'IBM Maximo',
    status: 'Proof of concept',
    source: `${sourceRoot}apps/desktop/content/experience/ibm-intern.md`,
    summary: 'A prototype Repair-or-Replace decision system for enterprise asset management, exploring how data can inform an asset’s lifecycle.',
    tags: 'Python · Data science · Maximo EAM',
    role: 'Data science internship · 2019',
    notes: [
      'I built a Python prototype exploring repair-or-replace decisions for enterprise assets and presented a full-stack proof of concept.',
      'Research discussions and summaries helped connect the prototype to the wider IBM team. The question was how data could support asset lifecycle decisions; this was exploratory work.',
    ],
  },
  {
    id: 'sudanese-resistance-front',
    group: 'community',
    category: 'ADVOCACY & COMMUNITY',
    title: 'Sudanese Resistance Front',
    noteTitle: 'Sudanese Resistance Front',
    status: 'Community practice',
    source: `${sourceRoot}apps/desktop/applications/About/Projects.tsx#L284-L309`,
    summary: 'Community-led technology and political advocacy with the Sudanese Resistance Front and Awlad Al Neel, supporting grassroots organizing and underrepresented voices.',
    tags: 'Community technology · Human rights',
    role: 'Advocacy & community-led technology',
    notes: [
      'My involvement with the Sudanese Resistance Front and Awlad Al Neel connects political advocacy with community-led technology, supporting grassroots organizing and underrepresented voices.',
      'This entry reflects the community work described in my public portfolio.',
    ],
  },
  {
    id: 'interactive-portfolio',
    group: 'engineering',
    category: 'INTERACTIVE WEB',
    title: 'A portfolio you can inhabit',
    noteTitle: 'Interactive portfolio',
    status: 'Interactive portfolio',
    source: `${sourceRoot}README.md`,
    sourceLabel: 'Framework credits',
    summary: 'A Unix-inspired desktop for exploring projects, experience, and contact details. The original desktop uses Joey de Ruiter’s portfolio framework, with visual inspiration from Henry Heffernan.',
    tags: 'Three.js · Next.js · TypeScript',
    role: 'An interactive desktop and a direct path to the work',
    notes: [
      'The original portfolio presents projects and contact details through an interactive Unix-inspired desktop.',
      'It builds on Joey de Ruiter’s portfolio framework, with visual inspiration from Henry Heffernan. The original project uses Next.js, React, TypeScript, and Three.js.',
    ],
    extraSource: { href: 'https://github.com/noobianlabs/Portfolio-next', label: 'Explore the original source' },
  },
];
