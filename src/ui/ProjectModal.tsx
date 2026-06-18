import { PROJECTS } from '../data/projects';

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
      <span className="font-pixel text-[9px] uppercase tracking-widest text-teal-deep">Project</span>
      <h2 id="modal-title" className="mb-2 mt-2 font-sans text-[24px] font-bold leading-tight text-ink">
        {p.name}
      </h2>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${ACCENT_BG[p.accent]}`}>
        {p.tag}
      </span>
      <p className="my-4 font-sans text-[15px] leading-relaxed text-ink-soft">{p.desc}</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {p.stack.map((s) => (
          <span key={s} className="rounded-md border border-line bg-sunken px-2.5 py-1 text-[12px] font-medium text-ink-soft">
            {s}
          </span>
        ))}
      </div>
      {p.url ? (
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ui-focus-panel inline-flex items-center gap-2 rounded-panel bg-teal-deep px-5 py-3 font-sans text-[14px] font-semibold text-white shadow-[0_5px_0_#0c4a4c] outline-none transition-transform duration-150 hover:brightness-105 active:translate-y-0.5 active:shadow-[0_2px_0_#0c4a4c]"
        >
          Visit live <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-panel border border-line bg-sunken px-5 py-3 font-sans text-[14px] text-ink-faint">
          Internal tool, not public
        </span>
      )}
    </div>
  );
}
