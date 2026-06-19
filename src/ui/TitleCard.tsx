import { useUiStore } from '../store/uiStore';
import { resumeAudio } from '../engine/audio';

export function TitleCard() {
  const started = useUiStore((s) => s.started);
  const start = useUiStore((s) => s.start);
  if (started) return null;

  const enter = () => {
    resumeAudio();
    start();
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-gradient-to-b from-[#2a2018] to-[#15100a] px-6">
      <div className="anim-slideup w-full max-w-lg text-center">
        <span className="inline-block rounded-full border border-teal/40 bg-teal/10 px-3 py-1 font-pixel text-[9px] tracking-wide text-golden">
          INTERACTIVE PORTFOLIO
        </span>
        <h1 className="mt-6 font-pixel text-[clamp(20px,5vw,34px)] leading-[1.5] text-panel [text-shadow:0_3px_0_#1c130a]">
          Sayed Jehad&apos;s
          <br />
          <span className="text-teal">Developer&apos;s</span> World
        </h1>
        <p className="mt-3 text-[15px] text-on-dark-soft">You are the recruiter. Walk the grounds, meet Sayed, then step into his studio: his projects, resume, skills, and how to reach him.</p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {['Projects', 'Resume', 'Skills', 'About'].map((t) => (
            <span key={t} className="rounded-full border border-teal/30 bg-teal/10 px-2.5 py-0.5 font-sans text-[11px] font-semibold text-on-dark-soft">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[13px] text-on-dark-faint">
          <span className="flex items-center gap-2">
            {['W', 'A', 'S', 'D'].map((k) => (
              <kbd key={k} className="grid h-7 min-w-7 place-items-center rounded-md border border-[#5a452e] border-b-[3px] bg-[#3a2c1c] px-1 font-pixel text-[10px] text-panel">
                {k}
              </kbd>
            ))}
            move
          </span>
          <span className="flex items-center gap-2">
            <kbd className="grid h-7 min-w-7 place-items-center rounded-md border border-[#5a452e] border-b-[3px] bg-[#3a2c1c] px-2 font-pixel text-[10px] text-panel">
              E
            </kbd>
            interact
          </span>
        </div>

        <button
          onClick={enter}
          autoFocus
          className="mt-8 rounded-xl bg-teal px-8 py-4 font-pixel text-[11px] tracking-wide text-[#08231f] shadow-[0_6px_0_#14756c] outline-none transition-transform duration-150 hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#14756c] focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-[#15100a]"
        >
          ENTER THE WORLD ▸
        </button>
        <p className="mt-5 text-[11.5px] text-on-dark-faint">Best on desktop with a keyboard · touch controls appear on mobile</p>
      </div>
    </div>
  );
}
