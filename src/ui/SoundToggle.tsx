import { useUiStore } from '../store/uiStore';
import { blip, setMuted } from '../engine/audio';
import { useIsTouch } from '../hooks/useIsTouch';

export function SoundToggle() {
  const muted = useUiStore((s) => s.muted);
  const toggle = useUiStore((s) => s.toggleMute);
  const touch = useIsTouch();

  const onClick = () => {
    const next = !muted;
    setMuted(next);
    toggle();
    if (!next) blip(700);
  };

  // On touch, the bottom-right corner belongs to the joystick's "E" interact
  // button, so the mute chip moves up next to the Help chip in the top-right.
  // On desktop it stays bottom-right. Both clear the device safe-area.
  const pos = touch
    ? { top: 'calc(1rem + env(safe-area-inset-top))', right: 'calc(4.25rem + env(safe-area-inset-right))' }
    : { bottom: 'calc(1rem + env(safe-area-inset-bottom))', right: 'calc(1rem + env(safe-area-inset-right))' };

  return (
    <button
      aria-label="Mute sound"
      aria-pressed={muted}
      onClick={onClick}
      style={pos}
      className={`ui-chip ui-chip-btn ui-focus-dark fixed z-30 transition-shadow ${
        muted ? '' : 'shadow-[0_0_10px_rgba(45,212,191,0.45)] ring-1 ring-teal/50'
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
        {muted ? (
          <path d="M17 9l4 6M21 9l-4 6" />
        ) : (
          <>
            <path d="M16.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 6a8.5 8.5 0 0 1 0 12" />
          </>
        )}
      </svg>
    </button>
  );
}
