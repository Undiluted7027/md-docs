interface ParticipantColor {
  color: string;
  colorLight: string;
}

const PARTICIPANT_COLORS: readonly [ParticipantColor, ...ParticipantColor[]] = [
  { color: '#2563eb', colorLight: '#2563eb33' },
  { color: '#7c3aed', colorLight: '#7c3aed33' },
  { color: '#c2410c', colorLight: '#c2410c33' },
  { color: '#047857', colorLight: '#04785733' },
  { color: '#be123c', colorLight: '#be123c33' },
] as const;

export interface Participant {
  clientId: number;
  name: string;
  color: string;
  isLocal: boolean;
}

export const DISPLAY_NAME_MAX_LENGTH = 50;

/**
 * Trims and caps a display name for showing to participants, falling back to
 * 'Anonymous' when it is empty or not a string. Used both when publishing the
 * local name and when reading another participant's (untrusted) name, so the two
 * always agree.
 */
export function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return 'Anonymous';
  return value.trim().slice(0, DISPLAY_NAME_MAX_LENGTH) || 'Anonymous';
}

export function participantColor(clientId: number) {
  return PARTICIPANT_COLORS[clientId % PARTICIPANT_COLORS.length] ?? PARTICIPANT_COLORS[0];
}

/** Reads the small, untrusted user record carried in Yjs awareness state. */
export function participantsFromAwareness(
  states: Iterable<[number, unknown]>,
  localClientId: number,
): Participant[] {
  const participants: Participant[] = [];

  for (const [clientId, state] of states) {
    const fallback = participantColor(clientId);
    const user = readUser(state);
    participants.push({
      clientId,
      name: normalizeDisplayName(user?.name),
      color: readColor(user?.color) ?? fallback.color,
      isLocal: clientId === localClientId,
    });
  }

  return participants.sort((left, right) => {
    if (left.isLocal) return -1;
    if (right.isLocal) return 1;
    return left.name.localeCompare(right.name);
  });
}

function readUser(state: unknown): Record<string, unknown> | null {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
  const user = (state as Record<string, unknown>).user;
  if (!user || typeof user !== 'object' || Array.isArray(user)) return null;
  return user as Record<string, unknown>;
}

function readColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
}
