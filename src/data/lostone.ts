import type { Conversation, ConvQA } from '../store/uiStore';

// "The Guide": a cheerful, welcoming local who sits on the plaza bench and points
// visitors toward Sayed. (Symbol names are kept for stability; the character is the Guide.)
export const LOST_ONE = { name: 'The Guide', role: 'Friendly Local' } as const;

export const LOST_ONE_QA: ConvQA[] = [
  { id: 'who', q: 'Who is Sayed Jehad?', a: [
    'Ah, Sayed! A warm soul and a quiet grafter. He started in sales, found his feet in HR, and taught himself to build the smart tools.',
    'That studio up the path is all his. Step inside, you will see what I mean.',
  ]},
  { id: 'built', q: 'What has he built?', a: [
    'Oh, more than you would expect! A careers site anyone in the world can open, an attendance app the whole team leans on, and learning tools the trainers adore.',
    'Real, working products, and he shaped every one with his own hands.',
  ]},
  { id: 'path', q: 'How did a salesman become a developer?', a: [
    'Funny story, that one! Sales taught him people, HR taught him systems, then he picked up the new AI tools and just ran with them.',
    'Never looked back, that man.',
  ]},
  { id: 'find', q: 'Where do I find him?', a: [
    'Easy! Just follow the stone path straight up. He is waiting right by the door.',
    'Say hello, and he will show you everything inside.',
  ]},
  { id: 'you', q: 'And who are you?', a: [
    'Me? Just a friendly face who knows this place well.',
    'I sit here, enjoy the birds, and point good people like you the right way. Welcome, friend!',
  ]},
  { id: 'fun', q: 'Anything fun inside?', a: [
    'There is a water cooler by the door. Sayed swears it has a little magic.',
    'Give it a try when you need a refresh.',
  ]},
];

export const LOST_ONE_CONVERSATION: Conversation = {
  speaker: { name: LOST_ONE.name, role: LOST_ONE.role },
  qa: LOST_ONE_QA,
};
