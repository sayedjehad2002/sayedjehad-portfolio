import { useUiStore } from '../store/uiStore';
import { ModalShell } from './ModalShell';
import { ProjectModal } from './ProjectModal';
import { TechPanel } from './TechPanel';
import { ResumeDossier } from './ResumeDossier';
import { AboutPanel } from './AboutPanel';
import { ArcadeModal } from './ArcadeModal';

export function Modals() {
  const modal = useUiStore((s) => s.modal);
  const close = useUiStore((s) => s.closeModal);
  if (!modal) return null;

  // The arcade is a full-bleed game overlay with its own canvas, not the cream
  // ModalShell box, so it renders on its own.
  if (modal.kind === 'arcade') return <ArcadeModal />;

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
