import { useUiStore } from '../store/uiStore';
import { resumeAudio } from '../engine/audio';
import { useIsTouch } from '../hooks/useIsTouch';

export function TitleCard() {
  const started = useUiStore((s) => s.started);
  const start = useUiStore((s) => s.start);
  const touch = useIsTouch();
  if (started) return null;

  const enter = () => {
    resumeAudio();
    start();
  };

  return (
    // Background as an INLINE gradient (+ solid fallback) rather than Tailwind
    // arbitrary-value gradient classes: the latter rendered transparent in some
    // browsers (Firefox), letting the bright world bleed through and wreck the
    // text contrast. Inline gradients paint opaquely everywhere.
    // The layer scrolls (overflow-y-auto) so on short / landscape phones the card
    // can exceed the viewport without the CTA falling below the fold.
    <div
      className="fixed inset-0 z-40 overflow-y-auto"
      style={{ backgroundColor: '#15100a', backgroundImage: 'radial-gradient(135% 100% at 50% 30%, #2e2218, #15100a 72%)' }}
    >
      {/* min-h-full grid centers the card when it fits and lets it scroll (with py
          breathing room) when it is taller than the viewport. */}
      <div className="grid min-h-full place-items-center px-6 py-8">
        {/* Children fade/slide in on a short stagger (badge -> title -> subhead ->
            pills -> controls -> CTA) for a warm, composed reveal. The .anim-slideup
            class starts each child hidden via its `both` fill; reduced-motion zeroes
            the duration + delay (index.css) so everything just appears at once. */}
        <div className="w-full max-w-lg text-center">
          <span
            className="anim-slideup inline-block rounded-full border border-teal/40 bg-teal/10 px-3 py-1 font-pixel text-eyebrow tracking-wide text-golden"
            style={{ animationDelay: '0ms' }}
          >
            INTERACTIVE PORTFOLIO
          </span>
          <h1
            className="anim-slideup mt-6 font-pixel text-[clamp(20px,5vw,34px)] leading-[1.5] text-panel [text-shadow:0_3px_0_#1c130a]"
            style={{ animationDelay: '70ms' }}
          >
            Sayed Jehad&apos;s
            <br />
            <span className="title-sheen text-teal">Developer&apos;s</span> World
          </h1>
          <p
            className="anim-slideup mt-3 text-ui leading-relaxed text-[#F2E9D6] [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]"
            style={{ animationDelay: '140ms' }}
          >
            Step into Sayed Jehad&apos;s world. Wander the grounds, meet Sayed, then explore his studio: his projects, resume, skills, and how to connect.
          </p>

          <div className="anim-slideup mt-3 flex flex-wrap items-center justify-center gap-1.5" style={{ animationDelay: '210ms' }}>
            {['Projects', 'Resume', 'Skills', 'About'].map((t) => (
              <span key={t} className="rounded-full border border-teal/30 bg-teal/10 px-2.5 py-0.5 font-sans text-caption font-semibold text-on-dark-soft">
                {t}
              </span>
            ))}
          </div>

          <div className="anim-slideup mt-6 flex flex-wrap items-center justify-center gap-5 text-small text-on-dark-faint" style={{ animationDelay: '280ms' }}>
            {touch ? (
              <>
                <span className="flex items-center gap-2">
                  <span className="relative grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-black/30" aria-hidden="true">
                    <span className="h-3 w-3 rounded-full bg-teal/80" />
                  </span>
                  drag to move
                </span>
                <span className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-teal font-pixel text-micro text-[#08231f]" aria-hidden="true">E</span>
                  tap to interact
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-2">
                  {['W', 'A', 'S', 'D'].map((k) => (
                    <kbd key={k} className="grid h-7 min-w-7 place-items-center rounded-md border border-[#5a452e] border-b-[3px] bg-[#3a2c1c] px-1 font-pixel text-micro text-panel">
                      {k}
                    </kbd>
                  ))}
                  move
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="grid h-7 min-w-7 place-items-center rounded-md border border-[#5a452e] border-b-[3px] bg-[#3a2c1c] px-2 font-pixel text-micro text-panel">
                    E
                  </kbd>
                  interact
                </span>
              </>
            )}
          </div>

          <div className="anim-slideup" style={{ animationDelay: '350ms' }}>
            <button
              onClick={enter}
              autoFocus
              className="mt-8 rounded-xl bg-teal px-8 py-4 font-pixel text-caption tracking-wide text-[#08231f] shadow-[0_6px_0_#14756c] outline-none transition-transform duration-150 hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#14756c] focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-[#15100a]"
            >
              ENTER THE WORLD ▸
            </button>
            <p className="mt-5 text-label text-on-dark-soft [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              {touch ? 'Drag the joystick to walk · tap E to interact' : 'Best on desktop with a keyboard · touch controls appear on mobile'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
