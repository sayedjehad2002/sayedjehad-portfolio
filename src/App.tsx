import { GameCanvas } from './ui/GameCanvas';
import { TitleCard } from './ui/TitleCard';
import { DialogueBar } from './ui/DialogueBar';
import { ConversationPanel } from './ui/ConversationPanel';
import { Modals } from './ui/Modals';
import { SoundToggle } from './ui/SoundToggle';
import { HelpButton } from './ui/HelpDialog';
import { Brand } from './ui/Brand';
import { TouchControls } from './ui/TouchControls';

export default function App() {
  return (
    <>
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
      <DialogueBar />
      <ConversationPanel />
      <Modals />
      <TitleCard />
      <TouchControls />
    </>
  );
}
