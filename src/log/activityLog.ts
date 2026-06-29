import type { ActivityLogEntry, LogCategory, LogLevel } from '../types/openid4vp';

let idCounter = 0;

export function createLogEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: unknown,
): ActivityLogEntry {
  return {
    id: `log-${++idCounter}-${Date.now()}`,
    timestamp: new Date(),
    level,
    category,
    message,
    details,
  };
}

export function formatLogTime(date: Date): string {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatLogDetails(details: unknown): string {
  if (details === undefined) return '';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export const CLAIM_LABELS: Record<string, string> = {
  given_name: 'Vorname',
  family_name: 'Nachname',
  birth_date: 'Geburtsdatum',
  birthdate: 'Geburtsdatum',
  email: 'E-Mail',
  address: 'Adresse',
  national_id: 'Personalausweis-Nr.',
  nationalities: 'Staatsangehörigkeit',
  'eu.europa.ec.eudi.pid.1': 'Personalausweis (PID)',
};

/** Mock-Identität: alternative Keys auf gespeicherte Claim-Namen abbilden */
const CLAIM_MOCK_ALIASES: Record<string, string> = {
  birthdate: 'birth_date',
};

export function claimLabel(key: string): string {
  return CLAIM_LABELS[key] ?? key;
}

export function mockClaimValue(identityClaims: Record<string, string>, key: string): string {
  if (identityClaims[key]) return identityClaims[key];
  const alias = CLAIM_MOCK_ALIASES[key];
  if (alias && identityClaims[alias]) return identityClaims[alias];
  return '';
}
