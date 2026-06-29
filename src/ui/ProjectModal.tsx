import { PROJECTS } from '../data/projects';
import { PrimaryLink } from './components/Button';

const ACCENT_BG: Record<string, string> = {
  aidev: 'bg-aidev-tint text-aidev-deep',
  hr: 'bg-hr-tint text-hr-deep',
  sales: 'bg-sales-tint text-sales-deep',
};
const SCREEN: Record<string, string> = {
  aidev: 'from-[#7A5BA6] to-[#4A3268]',
  hr: 'from-[#1F8A8C] to-[#10545a]',
  sales: 'from-[#C2682B] to-[#7E3F12]',
};
// soft inner glow keyed to each project's accent (cozy, not glassmorphism)
const GLOW: Record<string, string> = {
  aidev: 'shadow-[inset_0_0_30px_rgba(122,91,166,0.35)]',
  hr: 'shadow-[inset_0_0_30px_rgba(31,138,140,0.35)]',
  sales: 'shadow-[inset_0_0_30px_rgba(194,104,43,0.35)]',
};

export function ProjectModal({ id }: { id: string }) {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return null;

  return (
    <div>
      <div
        className={`mb-4 h-24 rounded-xl bg-gradient-to-br ${SCREEN[p.accent]} ${GLOW[p.accent]} relative overflow-hidden`}
        aria-hidden="true"
      >
        {/* mini app-window title bar with traffic-light dots */}
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-black/15 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#ff5f56]/50" />
          <span className="h-2 w-2 rounded-full bg-[#ffbd2e]/50" />
          <span className="h-2 w-2 rounded-full bg-[#27c93f]/50" />
          <span className="ml-2 h-1.5 w-28 rounded bg-white/20" />
        </div>
        {/* faint content lines */}
        <div className="px-4 pt-3">
          <div className="h-1.5 w-24 rounded bg-white/55" />
          <div className="mt-2 h-1.5 w-16 rounded bg-white/35" />
          <div className="mt-2 h-1.5 w-20 rounded bg-white/25" />
        </div>
      </div>
      <span className="font-pixel text-eyebrow uppercase tracking-widest text-teal-deep">Project</span>
      <h2 id="modal-title" className="mb-2 mt-2 font-sans text-display font-bold leading-tight text-ink">
        {p.name}
      </h2>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold uppercase tracking-wide ${ACCENT_BG[p.accent]}`}>
        {p.tag}
      </span>
      <p className="my-4 font-sans text-ui leading-relaxed text-ink-soft">{p.desc}</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {p.stack.map((s) => (
          <span key={s} className="rounded-md border border-line bg-sunken px-2.5 py-1 text-label font-medium text-ink-soft transition-colors duration-150 hover:border-teal/50 hover:bg-white hover:text-ink">
            {s}
          </span>
        ))}
      </div>
      {p.url ? (
        <PrimaryLink href={p.url} target="_blank" rel="noopener noreferrer">
          Visit live <span aria-hidden="true">↗</span>
        </PrimaryLink>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-panel border border-line bg-sunken px-5 py-3 font-sans text-body text-ink-faint">
          Internal tool, not public
        </span>
      )}
    </div>
  );
}
