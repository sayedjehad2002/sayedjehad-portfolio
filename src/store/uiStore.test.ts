import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore, isOverlayOpen, type Conversation, type UiState } from './uiStore';

// Reset to the initial shape before each test (zustand has no built-in reset).
const initial: Pick<UiState, 'started' | 'scene' | 'dialogue' | 'conversation' | 'modal' | 'muted'> = {
  started: false,
  scene: 'plaza',
  dialogue: null,
  conversation: null,
  modal: null,
  muted: false,
};

const sampleConv: Conversation = {
  speaker: { name: 'The Guide', role: 'NPC' },
  qa: [{ id: 'q1', q: 'Who are you?', a: ['A guide.'] }],
};

describe('uiStore — actions', () => {
  beforeEach(() => {
    useUiStore.setState({ ...initial });
  });

  it('start() flips started true', () => {
    expect(useUiStore.getState().started).toBe(false);
    useUiStore.getState().start();
    expect(useUiStore.getState().started).toBe(true);
  });

  it('setScene() switches the active scene', () => {
    useUiStore.getState().setScene('studio');
    expect(useUiStore.getState().scene).toBe('studio');
    useUiStore.getState().setScene('plaza');
    expect(useUiStore.getState().scene).toBe('plaza');
  });

  it('openModal()/closeModal() set and clear the modal', () => {
    useUiStore.getState().openModal({ kind: 'project', id: 'p1' });
    expect(useUiStore.getState().modal).toEqual({ kind: 'project', id: 'p1' });
    useUiStore.getState().closeModal();
    expect(useUiStore.getState().modal).toBeNull();
  });

  it('openDialogue()/endDialogue() set and clear dialogue lines', () => {
    useUiStore.getState().openDialogue(['Hi.', 'Welcome.']);
    expect(useUiStore.getState().dialogue).toEqual({ lines: ['Hi.', 'Welcome.'] });
    useUiStore.getState().endDialogue();
    expect(useUiStore.getState().dialogue).toBeNull();
  });

  it('skipDialogue() clears dialogue (alias for endDialogue)', () => {
    useUiStore.getState().openDialogue(['Long monologue...']);
    useUiStore.getState().skipDialogue();
    expect(useUiStore.getState().dialogue).toBeNull();
  });

  it('openConversation()/closeConversation() set and clear the conversation', () => {
    useUiStore.getState().openConversation(sampleConv);
    expect(useUiStore.getState().conversation).toEqual(sampleConv);
    useUiStore.getState().closeConversation();
    expect(useUiStore.getState().conversation).toBeNull();
  });

  it('toggleMute() flips muted both ways', () => {
    expect(useUiStore.getState().muted).toBe(false);
    useUiStore.getState().toggleMute();
    expect(useUiStore.getState().muted).toBe(true);
    useUiStore.getState().toggleMute();
    expect(useUiStore.getState().muted).toBe(false);
  });
});

describe('uiStore — isOverlayOpen selector', () => {
  beforeEach(() => {
    useUiStore.setState({ ...initial });
  });

  it('is true before the game has started (title card counts as an overlay)', () => {
    expect(isOverlayOpen(useUiStore.getState())).toBe(true);
  });

  it('is false once started with no dialogue/conversation/modal', () => {
    useUiStore.getState().start();
    expect(isOverlayOpen(useUiStore.getState())).toBe(false);
  });

  it('is true when a dialogue is open', () => {
    useUiStore.getState().start();
    useUiStore.getState().openDialogue(['x']);
    expect(isOverlayOpen(useUiStore.getState())).toBe(true);
  });

  it('is true when a conversation is open', () => {
    useUiStore.getState().start();
    useUiStore.getState().openConversation(sampleConv);
    expect(isOverlayOpen(useUiStore.getState())).toBe(true);
  });

  it('is true when a modal is open', () => {
    useUiStore.getState().start();
    useUiStore.getState().openModal({ kind: 'about' });
    expect(isOverlayOpen(useUiStore.getState())).toBe(true);
  });

  it('returns to false after every overlay is closed', () => {
    const s = useUiStore.getState();
    s.start();
    s.openModal({ kind: 'arcade' });
    expect(isOverlayOpen(useUiStore.getState())).toBe(true);
    useUiStore.getState().closeModal();
    expect(isOverlayOpen(useUiStore.getState())).toBe(false);
  });
});
