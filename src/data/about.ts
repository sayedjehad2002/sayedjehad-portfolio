import { LINKEDIN } from './roles';

// Sayed's personal story and how to reach him: the "About Me" + Contact beat.
// Journey-first and honest, so a visitor understands who he is and why his
// path matters, then has a clear way to act. Edit freely.
export const ABOUT = {
  eyebrow: 'Who I am',
  title: 'From HR into AI development',
  story: [
    'My background is in people. I spent most of my career in HR, where I learned how the right systems and quiet processes hold a whole company together.',
    'A start in sales first taught me to really listen and understand what people actually need.',
    'When modern AI tooling arrived, I taught myself to build. Today I ship real products at Lumofy, from a public careers site to the attendance system the whole team runs on every day.',
  ],
  values: [
    'Build tools that solve real problems for real people.',
    'Own the work end to end, from the first idea to production.',
    'Keep learning fast, and ship.',
  ],
} as const;

// One place for every way to reach Sayed. The CV path is resolved with the app
// base URL at render time so it survives a sub-path deploy.
export const CONTACT = {
  email: 'lumofybh@gmail.com',
  linkedin: LINKEDIN,
  cv: 'source/sayed-jehad-cv.pdf',
} as const;
