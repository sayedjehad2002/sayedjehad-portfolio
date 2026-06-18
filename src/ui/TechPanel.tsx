import { STACK } from '../data/stack';

export function TechPanel() {
  return (
    <div>
      <span className="font-pixel text-[9px] uppercase tracking-widest text-teal-deep">Toolkit</span>
      <h2 id="modal-title" className="mb-2 mt-2 font-sans text-[24px] font-bold leading-tight text-ink">
        Production stack
      </h2>
      <p className="mb-4 font-sans text-[15px] leading-relaxed text-ink-soft">
        The tools Sayed builds and ships with, from idea to deployment.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {STACK.map((t) => (
          <div
            key={t.name}
            className="rounded-[10px] border border-line bg-sunken px-3 py-2.5 transition-colors duration-150 hover:border-teal/60 hover:bg-white"
          >
            <div className="font-sans text-[13px] font-bold text-ink">{t.name}</div>
            <div className="font-sans text-[11px] text-ink-faint">{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
