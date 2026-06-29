import { useState } from 'react';
import { ModalShell } from './ModalShell';
import { EnvSettings } from './EnvSettings';
import { PrimaryButton } from './components/Button';

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Controls"
        onClick={() => setOpen(true)}
        style={{ top: 'calc(1rem + env(safe-area-inset-top))', right: 'calc(1rem + env(safe-area-inset-right))' }}
        className="ui-chip ui-chip-btn ui-focus-dark fixed z-30"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" />
          <path d="M9.4 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.4 2.1-2.4 3.8" />
          <circle cx="12" cy="17.4" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <ModalShell onClose={() => setOpen(false)} labelledBy="help-title" width="max-w-sm">
          <span className="font-pixel text-eyebrow uppercase tracking-widest text-teal-deep">How to play</span>
          <h2 id="help-title" className="mb-3 mt-2 font-sans text-display font-bold leading-tight text-ink">Controls</h2>
          <ul className="flex flex-col gap-2.5 font-sans text-ui text-ink-soft">
            {[
              ['Move', 'W A S D or arrows'],
              ['Interact / talk', 'E'],
              ['Continue dialogue', 'Space, Enter, or tap'],
              ['Skip conversation', 'Esc or S'],
              ['Close a panel', 'Esc'],
            ].map(([action, keys]) => (
              <li key={action} className="flex items-baseline justify-between gap-4 border-b border-line/70 pb-2 last:border-0 last:pb-0">
                <span>{action}</span>
                <span className="shrink-0 text-right font-semibold text-ink">{keys}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-sans text-small text-ink-faint">Walk up to Sayed, press E to talk, then step through the door to see his work.</p>
          <EnvSettings />
          <PrimaryButton onClick={() => setOpen(false)} className="mt-5">
            Got it, let me play
          </PrimaryButton>
        </ModalShell>
      )}
    </>
  );
}
