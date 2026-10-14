import { toOrganisation } from './organisation.mapper';

describe('toOrganisation (the messy fixture records)', () => {
  it('keeps a clean record as it is', () => {
    const org = toOrganisation(
      {
        id: 1,
        name: 'Northwind Traders',
        status: 'active',
        memberCount: 42,
        owner: { email: 'ops@northwind.example' },
        createdAt: '2024-03-11T09:12:00Z',
      },
      0,
    );
    expect(org.name).toBe('Northwind Traders');
    expect(org.status).toBe('active');
    expect(org.memberCount).toBe(42);
    expect(org.ownerEmailValid).toBe(true);
    expect(org.createdAt?.toISOString()).toBe('2024-03-11T09:12:00.000Z');
  });

  it('handles empty name, "ACTIVE", numeric string, epoch date (record 2)', () => {
    const org = toOrganisation(
      { id: 2, name: '', status: 'ACTIVE', memberCount: '12', owner: { email: 'a@b.example' }, createdAt: 1710150720000 },
      1,
    );
    expect(org.name).toBeNull();
    expect(org.status).toBe('active');
    expect(org.memberCount).toBe(12);
    expect(org.createdAt?.getTime()).toBe(1710150720000);
  });

  it('handles null name, negative count and a missing owner (record 3)', () => {
    const org = toOrganisation(
      { id: 3, name: null, status: 'Active', memberCount: -1, createdAt: '2024-01-02T00:00:00Z' },
      2,
    );
    expect(org.name).toBeNull();
    expect(org.memberCount).toBeNull();
    expect(org.ownerEmail).toBeNull();
  });

  it('does not guess typos: "actve" is unknown (record 5)', () => {
    expect(toOrganisation({ status: 'actve' }, 0).status).toBe('unknown');
  });

  it('gives duplicate API ids different uids (id 42 twice)', () => {
    const a = toOrganisation({ id: 42 }, 3);
    const b = toOrganisation({ id: 42 }, 4);
    expect(a.id).toBe(b.id);
    expect(a.uid).not.toBe(b.uid);
  });

  it('handles null status/count, a bad email and a bad date (record 8)', () => {
    const org = toOrganisation(
      { id: 8, name: 'Initech', status: null, memberCount: null, owner: { email: 'not-an-email' }, createdAt: 'not a date' },
      7,
    );
    expect(org.status).toBe('unknown');
    expect(org.memberCount).toBeNull();
    expect(org.ownerEmail).toBe('not-an-email');
    expect(org.ownerEmailValid).toBe(false);
    expect(org.createdAt).toBeNull();
  });

  it('does not turn an empty string into 0 members', () => {
    expect(toOrganisation({ memberCount: '' }, 0).memberCount).toBeNull();
    expect(toOrganisation({ memberCount: 12.5 }, 0).memberCount).toBeNull();
    expect(toOrganisation({ memberCount: 0 }, 0).memberCount).toBe(0);
  });

  it('never throws on completely wrong types', () => {
    const org = toOrganisation({ name: 5, status: {}, memberCount: [], owner: 'x', createdAt: {} }, 0);
    expect(org.name).toBeNull();
    expect(org.status).toBe('unknown');
    expect(org.createdAt).toBeNull();
  });

  it('trims names and keeps Arabic + emoji', () => {
    expect(toOrganisation({ name: '  شركة الأمل 🚀 ' }, 0).name).toBe('شركة الأمل 🚀');
  });
});
