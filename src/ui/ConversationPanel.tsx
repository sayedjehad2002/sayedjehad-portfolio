import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useUiStore } from '../store/uiStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { blip } from '../engine/audio';

const SPEED = 60; // chars per second (mirror DialogueBar)

type View = { kind: 'menu' } | { kind: 'answer'; qi: number };

/** Inline pixel-art portrait of the Guide: white thobe, red-and-white shemagh, short beard. */
function GuidePortrait() {
  // 22-unit grid scaled up so each rect reads as a crisp pixel block.
  const thobe = '#EDE7D6';
  const thobeHi = '#F7F3E8';
  const thobeSh = '#D2C9B2';
  const skin = '#C98A5E';
  const skinHi = '#E8B68C';
  const skinSh = '#B5764A';
  const beard = '#2E2620';
  const beardHi = '#3A2F25';
  const red = '#B23A36';
  const agal = '#1A1714';
  return (
    <svg
      viewBox="0 0 22 22"
      width={88}
      height={88}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Portrait of the Guide, a friendly local in a white thobe and a red and white shemagh"
      className="h-full w-full"
    >
      <rect x="0" y="0" width="22" height="22" fill="#3E5A52" />
      {/* white thobe shoulders */}
      <rect x="2" y="17" width="18" height="5" fill={thobe} />
      <rect x="3" y="16" width="16" height="2" fill={thobeHi} />
      <rect x="10" y="17" width="2" height="3" fill={thobeSh} />
      {/* shemagh white drape: crown + sides + onto the shoulders */}
      <rect x="4" y="4" width="14" height="4" fill={thobe} />
      <rect x="4" y="6" width="2" height="10" fill={thobe} />
      <rect x="16" y="6" width="2" height="10" fill={thobe} />
      <rect x="3" y="14" width="3" height="3" fill={thobe} />
      <rect x="16" y="14" width="3" height="3" fill={thobe} />
      {/* red check accents */}
      <rect x="6" y="5" width="1" height="1" fill={red} />
      <rect x="9" y="5" width="1" height="1" fill={red} />
      <rect x="12" y="5" width="1" height="1" fill={red} />
      <rect x="15" y="5" width="1" height="1" fill={red} />
      <rect x="4" y="9" width="1" height="1" fill={red} />
      <rect x="4" y="12" width="1" height="1" fill={red} />
      <rect x="17" y="9" width="1" height="1" fill={red} />
      <rect x="17" y="12" width="1" height="1" fill={red} />
      <rect x="3" y="15" width="1" height="1" fill={red} />
      <rect x="18" y="15" width="1" height="1" fill={red} />
      {/* black agal band on top */}
      <rect x="5" y="2" width="12" height="2" fill={agal} />
      <rect x="5" y="2" width="12" height="1" fill="#2A2620" />
      {/* warm face */}
      <rect x="6" y="6" width="10" height="10" fill={skin} />
      <rect x="6" y="6" width="10" height="2" fill={skinHi} />
      <rect x="6" y="6" width="2" height="10" fill={skinSh} />
      {/* brows + eyes */}
      <rect x="8" y="9" width="2" height="1" fill={beard} />
      <rect x="12" y="9" width="2" height="1" fill={beard} />
      <rect x="8" y="10" width="2" height="2" fill="#16121A" />
      <rect x="12" y="10" width="2" height="2" fill="#16121A" />
      {/* nose */}
      <rect x="10" y="11" width="1" height="2" fill={skinSh} />
      {/* friendly mouth, mustache, short beard */}
      <rect x="9" y="13" width="4" height="1" fill="#9A5E3E" />
      <rect x="9" y="12" width="4" height="1" fill={beard} />
      <rect x="7" y="14" width="8" height="2" fill={beard} />
      <rect x="8" y="15" width="6" height="1" fill={beardHi} />
    </svg>
  );
}

export function ConversationPanel() {
  const conversation = useUiStore((s) => s.conversation);
  const closeConversation = useUiStore((s) => s.closeConversation);
  const reduced = useReducedMotion();

  const [view, setView] = useState<View>({ kind: 'menu' });
  const [shown, setShown] = useState(0);

  const questionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastAskedRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const qa = conversation?.qa ?? [];
  const answerLines = view.kind === 'answer' ? (qa[view.qi]?.a ?? []) : [];
  const fullAnswer = answerLines.join('\n\n');
  const typing = view.kind === 'answer' && shown < fullAnswer.length;

  // On open: remember focus + reset to the menu. On close: restore focus to the game.
  useEffect(() => {
    if (!conversation) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    setView({ kind: 'menu' });
    lastAskedRef.current = null;
    return () => {
      restoreRef.current?.focus?.();
    };
  }, [conversation]);

  // Typewriter for the current answer (mirrors DialogueBar's interval loop).
  useEffect(() => {
    if (view.kind !== 'answer') return;
    setShown(0);
    if (reduced) {
      setShown(fullAnswer.length);
      return;
    }
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= fullAnswer.length) window.clearInterval(id);
    }, 1000 / SPEED);
    intervalRef.current = id;
    return () => window.clearInterval(id);
  }, [view, fullAnswer, reduced]);

  // Focus: menu -> the last-asked (or first) question; answer -> the answer region
  // (so a screen reader reads it and the user tabs to the controls; never steals focus).
  useEffect(() => {
    if (view.kind === 'menu') {
      const t = lastAskedRef.current ?? 0;
      const pick = () => questionRefs.current[t] ?? questionRefs.current[0];
      if (pick()) pick()!.focus();
      else requestAnimationFrame(() => pick()?.focus());
    } else {
      answerRef.current?.focus();
    }
  }, [view]);

  const ask = useCallback((qi: number) => {
    lastAskedRef.current = qi;
    setView({ kind: 'answer', qi });
    setShown(0);
    blip(560);
  }, []);

  const backToMenu = useCallback(() => {
    setView({ kind: 'menu' });
    blip(640);
  }, []);

  // While typing, reveal the full answer at once (and stop the interval).
  const reveal = useCallback(() => {
    if (!typing) return;
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    setShown(fullAnswer.length);
  }, [typing, fullAnswer.length]);

  // Esc closes from anywhere; Enter/Space reveal the answer while it is typing.
  useEffect(() => {
    if (!conversation) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        e.preventDefault();
        closeConversation();
      } else if ((k === 'enter' || k === ' ') && typing) {
        e.preventDefault();
        reveal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [conversation, closeConversation, typing, reveal]);

  if (!conversation) return null;

  const { speaker } = conversation;
  const asked = view.kind === 'answer' ? qa[view.qi] : null;

  // Keep keyboard focus cycling inside the panel (lightweight focus trap).
  const onTrapKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <div className="anim-fade fixed inset-0 z-10 bg-[rgba(20,16,10,0.4)]" aria-hidden="true" onClick={closeConversation} />
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Conversation with The Guide"
          onKeyDown={onTrapKeyDown}
          className="anim-slideup w-full max-w-2xl rounded-panel border-2 border-line bg-panel p-3 shadow-panel"
        >
          {/* Header */}
          <div className="flex items-stretch gap-3">
            <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl border-2 border-amber bg-[#3E5A52] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)]">
              <GuidePortrait />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[17px] text-ink">{speaker.name}</span>
                <span className="rounded-full bg-[#F6E0CC] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-[#7E3F12]">
                  {speaker.role}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-line pt-3">
            {view.kind === 'menu' ? (
              <div className="flex flex-col gap-2">
                <p className="font-pixel text-[9px] uppercase tracking-widest text-teal-deep">Ask The Guide</p>
                <ul className="flex flex-col gap-2">
                  {qa.map((item, i) => (
                    <li key={item.id}>
                      <button
                        ref={(el) => {
                          questionRefs.current[i] = el;
                        }}
                        onClick={() => ask(i)}
                        className="min-h-[44px] w-full rounded-xl border border-line bg-white/70 px-3 py-2.5 text-left font-sans text-[14px] text-ink outline-none transition-colors hover:border-teal/50 hover:bg-white focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
                      >
                        {item.q}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={closeConversation}
                  aria-keyshortcuts="Escape"
                  className="mt-1 min-h-[44px] self-start rounded-lg px-3 py-2.5 font-sans text-[13px] font-semibold text-ink-soft outline-none transition-colors hover:text-teal-deep focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
                >
                  Leave ▸
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div ref={answerRef} tabIndex={-1} onClick={reveal} className="flex cursor-default flex-col gap-3 outline-none">
                  <p className="font-sans text-[13px] italic text-ink-soft">&ldquo;{asked?.q ?? ''}&rdquo;</p>
                  <p className="whitespace-pre-line font-sans text-[16px] leading-[1.6] text-ink">
                    {fullAnswer.slice(0, shown)}
                    {typing && <span className="caret font-pixel text-amber">▋</span>}
                  </p>
                </div>
                {/* announce the whole answer once to screen readers; keyed per question so it always re-announces */}
                <p key={asked?.id ?? 'none'} className="sr-only" aria-live="polite">
                  {!typing ? fullAnswer : ''}
                </p>
                {!typing && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={backToMenu}
                      className="min-h-[44px] rounded-xl border border-line bg-white/70 px-4 py-2.5 font-sans text-[14px] font-semibold text-teal-deep outline-none transition-colors hover:border-teal/50 hover:bg-white focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
                    >
                      Ask another
                    </button>
                    <button
                      onClick={closeConversation}
                      aria-keyshortcuts="Escape"
                      className="min-h-[44px] rounded-lg px-3 py-2.5 font-sans text-[13px] font-semibold text-ink-soft outline-none transition-colors hover:text-teal-deep focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
                    >
                      Leave ▸
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
