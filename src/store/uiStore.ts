import { create } from 'zustand';
import type { SceneId } from '../engine/types';

export type ModalKind = 'project' | 'stack' | 'resume' | 'about' | 'arcade';

export interface ModalState {
  kind: ModalKind;
  id?: string;
}

// Branching Q&A conversation for a secondary NPC (separate from Sayed's linear dialogue).
export interface ConvSpeaker {
  name: string;
  role: string;
}
export interface ConvQA {
  id: string;
  q: string;
  a: string[];
}
export interface Conversation {
  speaker: ConvSpeaker;
  qa: ConvQA[];
}

export interface UiState {
  started: boolean;
  scene: SceneId;
  dialogue: { lines: string[] } | null;
  conversation: Conversation | null;
  modal: ModalState | null;
  muted: boolean;

  start: () => void;
  setScene: (s: SceneId) => void;
  openDialogue: (lines: string[]) => void;
  endDialogue: () => void;
  skipDialogue: () => void;
  openConversation: (c: Conversation) => void;
  closeConversation: () => void;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  toggleMute: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  started: false,
  scene: 'plaza',
  dialogue: null,
  conversation: null,
  modal: null,
  muted: false,

  start: () => set({ started: true }),
  setScene: (scene) => set({ scene }),
  openDialogue: (lines) => set({ dialogue: { lines } }),
  endDialogue: () => set({ dialogue: null }),
  skipDialogue: () => set({ dialogue: null }), // intention-revealing alias for the Skip button
  openConversation: (conversation) => set({ conversation }),
  closeConversation: () => set({ conversation: null }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
}));

// Convenience selector for "is a blocking overlay open" (engine pauses input).
export function isOverlayOpen(s: UiState): boolean {
  return s.dialogue !== null || s.conversation !== null || s.modal !== null || !s.started;
}

// Dev-only: expose the store for local visual debugging (stripped from prod builds).
if (import.meta.env.DEV) {
  (window as unknown as { useUiStore?: typeof useUiStore }).useUiStore = useUiStore;
}
