import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  onClose: () => void;
  labelledBy?: string;
  children: ReactNode;
  width?: string;
}

export function ModalShell({ onClose, labelledBy, children, width = 'max-w-md' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab' && ref.current) {
        // simple focus trap
        const f = ref.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])',
        );
        if (f.length === 0) return;
        const first = f[0];
        const lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4">
      <div className="anim-fade absolute inset-0 bg-[rgba(20,16,10,0.5)] backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ transformOrigin: 'center', willChange: 'transform, opacity' }}
        className={`anim-pop relative z-10 w-full ${width} rounded-panel border border-line bg-panel p-6 shadow-pop ring-1 ring-black/5 outline-none`}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="ui-focus-panel absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-[10px] border border-line bg-sunken text-ink-soft outline-none transition-colors hover:border-teal hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
