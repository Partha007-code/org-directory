/** What the API sends us. Every field is `unknown` on purpose: we trust nothing. */
export interface RawOrganisation {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  memberCount?: unknown;
  owner?: unknown;
  createdAt?: unknown;
}

export type Status = 'active' | 'inactive' | 'suspended' | 'unknown';

/** Statuses a user may choose in the form ("unknown" only exists for broken data). */
export const SELECTABLE_STATUSES = ['active', 'inactive', 'suspended'] as const;

/** What the UI works with: clean, predictable types. */
export interface Organisation {
  /** Our own unique key. The API's `id` is NOT unique (see fixture: id 42 twice). */
  uid: string;
  id: number | null;
  name: string | null;
  status: Status;
  memberCount: number | null;
  ownerEmail: string | null;
  ownerEmailValid: boolean;
  createdAt: Date | null;
}
