import { GameCanvas } from './ui/GameCanvas';
import { TitleCard } from './ui/TitleCard';
import { DialogueBar } from './ui/DialogueBar';
import { ConversationPanel } from './ui/ConversationPanel';
import { Modals } from './ui/Modals';
import { SoundToggle } from './ui/SoundToggle';
import { HelpButton } from './ui/HelpDialog';
import { Brand } from './ui/Brand';
import { TouchControls } from './ui/TouchControls';
import { AccessibleMenu } from './ui/AccessibleMenu';
import { ClockChip } from './ui/ClockChip';
import { DiscoveryToast } from './ui/DiscoveryToast';
import { CompletionCard } from './ui/CompletionCard';

export default function App() {
  return (
    <>
      {/* First tab stop: an sr-only skip-nav + the document's single <h1>, so AT and
          keyboard-only users can reach the whole CV without operating the canvas. */}
      <AccessibleMenu />
      <GameCanvas />
      {/* soft vignette over the world */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{ background: 'radial-gradient(120% 90% at 50% 38%, transparent 54%, rgba(8,10,16,0.34) 100%)' }}
        aria-hidden="true"
      />
      <Brand />
      <HelpButton />
      <SoundToggle />
      <ClockChip />
      <DialogueBar />
      <ConversationPanel />
      <Modals />
      <DiscoveryToast />
      <CompletionCard />
      <TitleCard />
      <TouchControls />
    </>
  );
}
