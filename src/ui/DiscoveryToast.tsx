import { useEffect, useState } from 'react';
import { useProgress, STATIONS } from '../store/progressStore';

// A small, transient "Discovered X (n/6)" chip that slides in at the top-center
// each time the visitor opens a new station, then auto-dismisses. Non-blocking,
// reduced-motion friendly (CSS handles the slide), announced politely to AT.
export function DiscoveryToast() {
  const last = useProgress((s) => s.lastDiscovery);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!last) return;
    setShow(true);
    const id = window.setTimeout(() => setShow(false), 3200);
    return () => window.clearTimeout(id);
    // re-run on each new discovery (nonce changes even for the same count)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce is the intended trigger
  }, [last?.nonce]);

  if (!last || !show) return null;

  return (
    <div
      className="anim-slideup pointer-events-none fixed left-1/2 z-30 -translate-x-1/2"
      style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
      role="status"
      aria-live="polite"
    >
      <div className="ui-chip h-9 gap-2 px-3.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-teal">
          <path d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-sans text-label font-semibold leading-none text-white">Discovered {last.label}</span>
        <span className="font-sans text-caption font-semibold leading-none text-on-dark-faint tabular-nums">
          {last.count}/{STATIONS.length}
        </span>
      </div>
    </div>
  );
}
