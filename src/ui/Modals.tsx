import { lazy, Suspense } from 'react';
import { useUiStore } from '../store/uiStore';
import { ModalShell } from './ModalShell';
import { ProjectModal } from './ProjectModal';
import { TechPanel } from './TechPanel';
import { ResumeDossier } from './ResumeDossier';
import { AboutPanel } from './AboutPanel';

// The arcade (its OS shell + both games, ~2.5k LOC) is an optional interaction, so
// it is code-split into its own chunk and only fetched when the player opens it.
const ArcadeModal = lazy(() => import('./ArcadeModal').then((m) => ({ default: m.ArcadeModal })));

export function Modals() {
  const modal = useUiStore((s) => s.modal);
  const close = useUiStore((s) => s.closeModal);
  if (!modal) return null;

  // The arcade is a full-bleed game overlay with its own canvas, not the cream
  // ModalShell box, so it renders on its own (lazy-loaded; fallback is brief and
  // covered by the open interaction).
  if (modal.kind === 'arcade')
    return (
      <Suspense fallback={null}>
        <ArcadeModal />
      </Suspense>
    );

  const width = modal.kind === 'resume' ? 'max-w-2xl' : modal.kind === 'about' ? 'max-w-lg' : 'max-w-md';

  return (
    <ModalShell onClose={close} labelledBy="modal-title" width={width}>
      {modal.kind === 'project' && modal.id && <ProjectModal id={modal.id} />}
      {modal.kind === 'stack' && <TechPanel />}
      {modal.kind === 'resume' && <ResumeDossier />}
      {modal.kind === 'about' && <AboutPanel />}
    </ModalShell>
  );
}
