import { expect, test } from 'bun:test';
import { participantColor, participantsFromAwareness } from './presence.ts';

test('participants use validated awareness labels and put the current person first', () => {
  const states = new Map<number, unknown>([
    [20, { user: { name: '  Bea  ', color: '#7c3aed' } }],
    [10, { user: { name: 'Alex', color: 'not-a-color' } }],
  ]);

  expect(participantsFromAwareness(states, 10)).toEqual([
    { clientId: 10, name: 'Alex', color: participantColor(10).color, isLocal: true },
    { clientId: 20, name: 'Bea', color: '#7c3aed', isLocal: false },
  ]);
});

test('participants fall back safely when an awareness record is malformed', () => {
  const states = new Map<number, unknown>([[7, { user: { name: '   ' } }]]);

  expect(participantsFromAwareness(states, 1)).toEqual([
    { clientId: 7, name: 'Anonymous', color: participantColor(7).color, isLocal: false },
  ]);
});
