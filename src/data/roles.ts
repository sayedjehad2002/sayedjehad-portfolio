import type { PhaseKey } from '../theme/palette';

export type Glyph = 'handshake' | 'people' | 'spark';

export interface Role {
  company: string;
  title: string;
  dates: string;
  current?: boolean;
  points: string[];
}

export interface Phase {
  key: PhaseKey;
  label: string;
  glyph: Glyph;
  blurb: string;
  roles: Role[];
}

// The career arc, oldest -> newest, grouped into three phases.
export const PHASES: Phase[] = [
  {
    key: 'sales',
    label: 'Sales',
    glyph: 'handshake',
    blurb: 'Where it began: market research and client-facing work.',
    roles: [
      {
        company: 'Takhlees',
        title: 'Sales Intern',
        dates: '2024',
        points: [
          'Conducted market research and competitive analysis that informed the development and marketing strategy for the Takhlees mobile application.',
        ],
      },
      {
        company: 'Vamonos Hygiene Services',
        title: 'Sales Intern',
        dates: '2025',
        points: [
          'Introduced pest control services to prospective clients and supported follow-ups and client communication.',
        ],
      },
    ],
  },
  {
    key: 'hr',
    label: 'Human Resources',
    glyph: 'people',
    blurb: 'Into people operations: HRMS, recruitment, and process design.',
    roles: [
      {
        company: 'Vamonos Hygiene Services',
        title: 'Human Resources Intern',
        dates: '2025',
        points: [
          'Supported HRMS administration, employee data management, and compliance processes (LMRA, SIO, Bahrain Labour Law).',
          'Assisted with recruitment, onboarding, and documentation to ensure efficient HR operations.',
        ],
      },
      {
        company: 'Lumofy',
        title: 'Human Resources Intern',
        dates: 'Sep 2025 – Feb 2026',
        points: [
          'Designed KPI frameworks to track and evaluate employee performance.',
          'Maintained employee records in JISR HRMS and built a competency-based Talent Pool database in Excel.',
          'Organised HR documentation in Notion (centralised knowledge bases and streamlined workflows).',
        ],
      },
      {
        company: 'Lumofy',
        title: 'Talent Acquisition & Onboarding Specialist',
        dates: 'Feb 2026 – Apr 2026',
        points: [
          'Managed end-to-end recruitment: sourcing, screening, interviewing, and offer management.',
          'Built talent pipelines and ran onboarding programs aligned with HR policies using ATS & HRIS tools.',
          'Applied prompt engineering and low-code / no-code development to automate recruitment and onboarding workflows.',
          'Delivered a structured handover of the talent acquisition function while moving into the developer role.',
        ],
      },
    ],
  },
  {
    key: 'aidev',
    label: 'AI Development',
    glyph: 'spark',
    blurb: 'Now: building and shipping production tools across a modern AI stack.',
    roles: [
      {
        company: 'Lumofy',
        title: 'AI System Developer',
        dates: 'Apr 2026 – Present',
        current: true,
        points: [
          "Built and deployed careers.lumofy.ai, Lumofy's public careers page for candidates to browse roles and apply.",
          'Built and deployed Lumofy Pulse, a company-wide HR attendance and leave system, now the primary internal tool.',
          'Delivered two L&D tools: a Dispatching tool for SCORM & proxy provisioning, and an AI Curator for course development.',
          'Sole developer across 4 live projects, one public site and three internal tools, owning each from requirements through to production deployment.',
          'Works across a modern AI-powered stack: Lovable, Claude Code, Supabase, Firebase, Vercel, and Netlify.',
        ],
      },
    ],
  },
];

export const EDUCATION = 'University of Bahrain, BSc Business Management (Marketing), 2025';
export const LINKEDIN = 'https://linkedin.com/in/sayed-jehad-saeed-1729b3150';
