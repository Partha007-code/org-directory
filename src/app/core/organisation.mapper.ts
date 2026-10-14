import { Organisation, RawOrganisation, Status } from './organisation.model';

/** Deliberately simple: something@something.something, no spaces. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const KNOWN_STATUSES: readonly Status[] = ['active', 'inactive', 'suspended'];

/**
 * Turns one messy API record into a clean Organisation.
 * Rule: never throw, never guess. If a value cannot be trusted it becomes null / 'unknown'
 * and the UI shows an honest placeholder.
 *
 * `position` is the record's index in the whole result set. We use it to build a unique key,
 * because the API's ids contain duplicates.
 */
export function toOrganisation(raw: RawOrganisation, position: number): Organisation {
  const ownerEmail = toOwnerEmail(raw.owner);
  return {
    uid: `org-${position}`,
    id: typeof raw.id === 'number' ? raw.id : null,
    name: toName(raw.name),
    status: toStatus(raw.status),
    memberCount: toMemberCount(raw.memberCount),
    ownerEmail,
    ownerEmailValid: ownerEmail !== null && EMAIL_PATTERN.test(ownerEmail),
    createdAt: toDate(raw.createdAt),
  };
}

/** "", "   ", null, numbers -> null. Otherwise trimmed text. */
function toName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name === '' ? null : name;
}

/** "ACTIVE", "Active", " active " -> 'active'. Typos like "actve" -> 'unknown' (we do not guess). */
function toStatus(value: unknown): Status {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return KNOWN_STATUSES.find((status) => status === text) ?? 'unknown';
}

/** 42 -> 42, "12" -> 12, -1 / null / "" / 12.5 / "abc" -> null. */
function toMemberCount(value: unknown): number | null {
  // Careful: Number("") is 0, so an empty string must be rejected BEFORE converting.
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isInteger(number) && number >= 0 ? number : null;
}

/** Owner is optional and may be null, missing, or have a broken email. */
function toOwnerEmail(owner: unknown): string | null {
  if (typeof owner !== 'object' || owner === null || !('email' in owner)) return null;
  const email = owner.email;
  if (typeof email !== 'string' || email.trim() === '') return null;
  return email.trim();
}

/** ISO text ("2024-03-11T09:12:00Z") and epoch milliseconds (1710150720000) both work. */
function toDate(value: unknown): Date | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
