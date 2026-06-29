import { ABOUT, CONTACT } from '../data/about';
import { CHARACTER } from '../data/character';
import { PrimaryLink, SecondaryLink } from './components/Button';

// "About Me" + Contact: the journey-first story behind the resume, then a clear
// way for a visitor to act. Mirrors the warm cream + teal-deep panel style.
export function AboutPanel() {
  const base = import.meta.env.BASE_URL;
  const photo = base + CHARACTER.photo;
  const cvHref = base + CONTACT.cv;

  return (
    <div>
      <span className="font-pixel text-eyebrow uppercase tracking-widest text-teal-deep">{ABOUT.eyebrow}</span>
      <h2 id="modal-title" className="mb-3 mt-2 font-sans text-display font-bold leading-tight text-ink">
        {ABOUT.title}
      </h2>

      <div className="flex items-start gap-4">
        <div className="hidden h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl border-2 border-teal bg-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.6)] sm:block">
          <img
            src={photo}
            alt={`Photo of ${CHARACTER.name}`}
            className="h-full w-full rounded-[10px] object-cover"
            onError={(e) => {
              e.currentTarget.parentElement?.classList.add('hidden');
            }}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          {ABOUT.story.map((p, i) => (
            <p key={i} className="font-sans text-body leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5">
        {ABOUT.values.map((v) => (
          <li key={v} className="relative pl-5 font-sans text-small leading-snug text-ink">
            <span className="absolute left-0 top-[6px] h-2 w-2 rotate-45 bg-teal" aria-hidden="true" />
            {v}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <PrimaryLink href={cvHref} download="Sayed-Jehad-CV.pdf">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
          </svg>
          Download CV
        </PrimaryLink>
        <SecondaryLink href={`mailto:${CONTACT.email}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m4 7 8 5 8-5" />
          </svg>
          Email
        </SecondaryLink>
        <SecondaryLink href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </SecondaryLink>
      </div>
    </div>
  );
}
