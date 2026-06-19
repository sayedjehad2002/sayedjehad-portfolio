import { useUiStore } from '../store/uiStore';
import { PROJECTS } from '../data/projects';
import { CONTACT } from '../data/about';
import { LINKEDIN } from '../data/roles';
import { DIALOGUE } from '../data/dialogue';

// Visually-hidden, keyboard-focusable companion so screen-reader and keyboard-only
// visitors can reach the whole CV without operating the canvas world (which is
// aria-hidden). It opens the very same React panels the game uses. Hidden until focused
// (standard skip-nav pattern); the first Tab from page load lands here, and focusing it
// reveals a small panel. Also provides the document's single <h1> and a nav landmark.
export function AccessibleMenu() {
  const openModal = useUiStore((s) => s.openModal);
  const openDialogue = useUiStore((s) => s.openDialogue);
  const cvHref = import.meta.env.BASE_URL + CONTACT.cv;
  const item =
    'block w-full rounded-lg bg-white/10 px-3 py-2 text-left font-sans text-[14px] font-semibold text-white no-underline outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-teal';

  return (
    <nav
      aria-label="Quick access to Sayed Jehad's CV"
      className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:left-3 focus-within:top-3 focus-within:z-50 focus-within:max-h-[92vh] focus-within:w-[288px] focus-within:overflow-auto focus-within:rounded-xl focus-within:border focus-within:border-teal/40 focus-within:bg-[#16110b]/95 focus-within:p-3 focus-within:shadow-2xl focus-within:backdrop-blur"
    >
      <h1 className="mb-1 font-pixel text-[15px] leading-tight text-white">Sayed Jehad · Developer's World</h1>
      <p className="mb-2 font-sans text-[12px] text-on-dark-faint">
        An interactive portfolio. Prefer not to play? Jump straight to any section:
      </p>
      <ul className="flex flex-col gap-1.5">
        <li>
          <button className={item} onClick={() => openDialogue(DIALOGUE)}>
            Meet Sayed (intro)
          </button>
        </li>
        <li>
          <button className={item} onClick={() => openModal({ kind: 'about' })}>
            About Sayed
          </button>
        </li>
        {PROJECTS.map((p) => (
          <li key={p.id}>
            <button className={item} onClick={() => openModal({ kind: 'project', id: p.id })}>
              Project: {p.name}
            </button>
          </li>
        ))}
        <li>
          <button className={item} onClick={() => openModal({ kind: 'resume' })}>
            Resume and career path
          </button>
        </li>
        <li>
          <button className={item} onClick={() => openModal({ kind: 'stack' })}>
            Skills and tech stack
          </button>
        </li>
        <li>
          <a className={item} href={`mailto:${CONTACT.email}`}>
            Email Sayed
          </a>
        </li>
        <li>
          <a className={item} href={LINKEDIN} target="_blank" rel="noopener noreferrer">
            LinkedIn profile
          </a>
        </li>
        <li>
          <a className={item} href={cvHref} download="Sayed-Jehad-CV.pdf">
            Download CV (PDF)
          </a>
        </li>
      </ul>
    </nav>
  );
}
