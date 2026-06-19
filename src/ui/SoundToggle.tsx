import { useUiStore } from '../store/uiStore';
import { blip, setMuted } from '../engine/audio';

export function SoundToggle() {
  const muted = useUiStore((s) => s.muted);
  const toggle = useUiStore((s) => s.toggleMute);

  const onClick = () => {
    const next = !muted;
    setMuted(next);
    toggle();
    if (!next) blip(700);
  };

  return (
    <button
      aria-label="Mute sound"
      aria-pressed={muted}
      onClick={onClick}
      className="ui-chip ui-chip-btn ui-focus-dark fixed bottom-4 right-4 z-30"
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
