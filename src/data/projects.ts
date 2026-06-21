import type { PhaseKey } from '../theme/palette';

export interface Project {
  id: string;
  name: string;
  tag: string;
  accent: PhaseKey; // colour family for the screen glow + chip
  desc: string;
  stack: string[];
  url: string | null; // null => internal tool, no public link
}

export const PROJECTS: Project[] = [
  {
    id: 'careers',
    name: 'careers.lumofy.ai',
    tag: 'Live · Public',
    accent: 'aidev',
    desc: "Lumofy's public-facing careers page. Candidates browse open roles and apply. Built and shipped end-to-end.",
    stack: ['Lovable', 'Supabase', 'Vercel'],
    url: 'https://careers.lumofy.ai',
  },
  {
    id: 'pulse',
    name: 'Lumofy Pulse',
    tag: 'Internal · HR',
    accent: 'aidev',
    desc: "A company-wide HR attendance and leave management system, now Lumofy's primary internal tool.",
    stack: ['React', 'Supabase', 'Netlify'],
    url: null, // internal HR system — no public link
  },
  {
    id: 'dispatch',
    name: 'Dispatching Tool',
    tag: 'Internal · L&D',
    accent: 'hr',
    desc: 'A SCORM and proxy provisioning tool for the L&D team that streamlines how courses get dispatched.',
    stack: ['Claude Code', 'Supabase'],
    url: null,
  },
  {
    id: 'curator',
    name: 'AI Curator',
    tag: 'Internal · L&D',
    accent: 'hr',
    desc: 'An AI-assisted course development app that helps the L&D team curate and build learning content faster.',
    stack: ['Claude Code', 'Firebase'],
    url: null,
  },
];
