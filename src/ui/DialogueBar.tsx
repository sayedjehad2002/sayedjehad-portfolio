import { useCallback, useEffect, useRef, useState } from 'react';
import { useUiStore } from '../store/uiStore';
import { CHARACTER } from '../data/character';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { blip } from '../engine/audio';

const SPEED = 60; // chars per second (snappy; any key reveals the rest of the line instantly)

export function DialogueBar() {
  const dialogue = useUiStore((s) => s.dialogue);
  const endDialogue = useUiStore((s) => s.endDialogue);
  const skipDialogue = useUiStore((s) => s.skipDialogue);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const twRef = useRef<number | null>(null); // running typewriter interval id (cleared on reveal so it sticks)

  const lines = dialogue?.lines ?? [];
  const line = lines[index] ?? '';
  const typing = shown < line.length;

  useEffect(() => {
    setIndex(0);
  }, [dialogue]);

  useEffect(() => {
    if (!dialogue) return;
    setShown(0);
    if (reduced) {
      setShown(line.length);
      return;
    }
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= line.length) window.clearInterval(id);
    }, 1000 / SPEED);
    twRef.current = id;
    return () => window.clearInterval(id);
  }, [dialogue, index, line, reduced]);

  const advance = useCallback(() => {
    if (!dialogue) return;
    if (shown < line.length) {
      if (twRef.current !== null) window.clearInterval(twRef.current); // stop the typewriter so the reveal sticks
      setShown(line.length);
      return;
    }
    if (index < lines.length - 1) {
      setIndex((i) => i + 1);
      blip(640);
    } else {
      endDialogue();
    }
  }, [dialogue, shown, line.length, index, lines.length, endDialogue]);

  useEffect(() => {
    if (!dialogue) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'enter' || k === 'e') {
        e.preventDefault();
        advance();
      } else if (k === 'escape' || k === 's') {
        e.preventDefault();
        skipDialogue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogue, advance, skipDialogue]);

  if (!dialogue) return null;

  const photo = import.meta.env.BASE_URL + CHARACTER.photo;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-4">
      <div
        role="group"
        aria-label="Dialogue with Sayed Jehad"
        className="anim-slideup w-full max-w-2xl rounded-panel border-2 border-line bg-panel p-3 shadow-panel"
      >
        <button onClick={advance} aria-label="Reveal or continue" aria-keyshortcuts="Space Enter" className="flex w-full items-stretch gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-panel">
          <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl border-2 border-teal bg-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.6)]">
            <img src={photo} alt={`Photo of ${CHARACTER.name}`} className="h-full w-full rounded-[10px] object-cover" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-1.5 flex items-center gap-2 border-b border-line pb-1.5">
              <span className="font-pixel text-[17px] text-ink">{CHARACTER.name}</span>
              <span className="rounded-full bg-[#D7EFEA] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-teal-deep">
                {CHARACTER.role}
              </span>
            </div>
            <p className="flex-1 font-sans text-[16px] leading-[1.6] text-ink">
              {line.slice(0, shown)}
              {typing && <span className="caret font-pixel text-amber">▋</span>}
            </p>
            {/* announce each full line once to screen readers, gated on !typing so the
                spoken text matches the visible typewriter (mirrors ConversationPanel) */}
            <p key={index} className="sr-only" aria-live="polite" aria-atomic="true">
              {!typing ? line : ''}
            </p>
          </div>
        </button>
        <div className="mt-2 flex items-center justify-between gap-2 pl-[100px]">
          <span className="font-sans text-[12px] text-ink-faint">
            <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-pixel text-[10px] text-ink-soft">Space</kbd>{' '}
            {typing ? 'reveal' : 'continue'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              skipDialogue();
            }}
            aria-label="Skip dialogue"
            aria-keyshortcuts="Escape S"
            className="-mr-1 flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2.5 font-sans text-[13px] font-semibold text-ink-soft outline-none transition-colors hover:text-teal-deep focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-panel active:translate-y-px"
          >
            <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-pixel text-[9px] text-ink-faint">Esc</kbd>
            Skip ▸
          </button>
        </div>
      </div>
    </div>
  );
}
