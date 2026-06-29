import { useProgress, STATIONS } from '../store/progressStore';
import { useUiStore, isOverlayOpen } from '../store/uiStore';
import { ModalShell } from './ModalShell';

// One-time "you've seen everything, let's connect" finale. Appears once the
// visitor has opened all stations AND has no other panel open (so it doesn't
// stack on the modal whose opening completed the set). Surfaces the contact CTAs
// directly, fixing the "contact is buried one interaction deep" gap. Dismissing
// marks it shown (persisted) so it never nags.
const CV = 'source/sayed-jehad-cv.pdf';
const EMAIL = 'mailto:lumofybh@gmail.com';
const LINKEDIN = 'https://linkedin.com/in/sayed-jehad-saeed-1729b3150';

export function CompletionCard() {
  const count = useProgress((s) => s.discovered.length);
  const completionShown = useProgress((s) => s.completionShown);
  const mark = useProgress((s) => s.markCompletionShown);
  const overlayOpen = useUiStore(isOverlayOpen);

  if (completionShown || count < STATIONS.length || overlayOpen) return null;

  return (
    <ModalShell onClose={mark} labelledBy="done-title" width="max-w-md">
      <span className="animate-pulse font-pixel text-[9px] uppercase tracking-widest text-teal-deep">You&apos;ve seen it all</span>
      <h2 id="done-title" className="title-sheen mb-2 mt-2 font-sans text-[24px] font-bold leading-tight text-ink">Thanks for exploring</h2>
      <p className="font-sans text-[15px] leading-relaxed text-ink-soft">
        That&apos;s the whole world: the projects, the career path, the tech, the about, and the arcade. If it resonated, I&apos;d love to connect.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <a href={CV} download className="ui-focus-panel rounded-xl bg-teal-deep px-5 py-3 font-sans text-[14px] font-semibold text-white outline-none transition-transform hover:brightness-105 active:translate-y-0.5">
          Download CV
        </a>
        <a href={EMAIL} className="ui-focus-panel rounded-xl border border-line bg-sunken px-5 py-3 font-sans text-[14px] font-semibold text-ink outline-none transition-colors hover:border-teal">
          Email
        </a>
        <a href={LINKEDIN} target="_blank" rel="noreferrer" className="ui-focus-panel rounded-xl border border-line bg-sunken px-5 py-3 font-sans text-[14px] font-semibold text-ink outline-none transition-colors hover:border-teal">
          LinkedIn
        </a>
      </div>
    </ModalShell>
  );
}
