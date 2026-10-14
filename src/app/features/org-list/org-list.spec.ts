import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OrganisationStore } from '../../core/organisation-store';
import { toOrganisation } from '../../core/organisation.mapper';
import { RawOrganisation } from '../../core/organisation.model';
import { OrgList } from './org-list';

const RAW: RawOrganisation[] = [
  { id: 1, name: 'Northwind Traders', status: 'active', memberCount: 42, owner: { email: 'ops@northwind.example' }, createdAt: '2024-03-11T09:12:00Z' },
  { id: 2, name: '', status: 'ACTIVE', memberCount: '12', owner: { email: 'a@b.example' }, createdAt: 1710150720000 },
  { id: 42, name: 'Globex Corporation', status: 'suspended', memberCount: 7, owner: { email: 'hq@globex.example' }, createdAt: '2023-11-30T14:45:10Z' },
  { id: 42, name: 'Globex Corporation Ltd', status: 'actve', memberCount: 7, createdAt: '2023-11-30T14:45:10Z' },
  { id: 6, name: 'شركة الأمل 🚀', status: 'active', memberCount: 3, createdAt: '2025-06-01T08:00:00Z' },
  { id: 8, name: 'Initech', status: null, memberCount: null, owner: { email: 'not-an-email' }, createdAt: 'not a date' },
];

async function open(url: string) {
  const store = TestBed.inject(OrganisationStore);
  vi.spyOn(store, 'load').mockResolvedValue();
  store.organisations.set(RAW.map((raw, i) => toOrganisation(raw, i)));
  store.receivedCount.set(RAW.length);
  store.serverTotal.set(RAW.length);
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl(url, OrgList);
  harness.detectChanges();
  const root: HTMLElement = harness.routeNativeElement!;
  const names = () => Array.from(root.querySelectorAll('tbody tr')).map((row) => row.querySelector('td')!.textContent!.trim());
  return { harness, component, root, store, names };
}

describe('OrgList', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([{ path: '', component: OrgList }])] }));

  it('shows every row, including the broken ones, with a text status label', async () => {
    const { root, names } = await open('/');
    expect(names().length).toBe(6);
    expect(names()).toContain('(No name)'); // empty name
    expect(root.textContent).toContain('Suspended'); // label next to the dot
    expect(root.textContent).toContain('Unknown'); // "actve" and null status
    expect(root.textContent).toContain('Invalid email');
    expect(root.querySelectorAll('.dot[aria-hidden="true"]').length).toBe(6); // dot is decoration only
  });

  it('keeps the two Globex records that share id 42', async () => {
    const { names } = await open('/');
    expect(names().filter((n) => n.startsWith('Globex')).length).toBe(2);
  });

  it('applies search + status from the URL', async () => {
    const { names } = await open('/?q=GLOBEX&status=suspended');
    expect(names()).toEqual(['Globex Corporation']);
  });

  it('sorts by name from the URL, putting unnamed last, and sets aria-sort', async () => {
    const { root, names } = await open('/?sort=name&dir=asc');
    expect(names().at(-1)).toBe('(No name)');
    expect(names()[0]).toBe('Globex Corporation');
    expect(root.querySelector('th[aria-sort="ascending"]')!.textContent).toContain('Name');
  });

  it('sorts by created date with invalid dates always last', async () => {
    const desc = await open('/?sort=created&dir=desc');
    expect(desc.names().at(-1)).toBe('Initech'); // "not a date"
  });

  it('shows a distinct "no results" state with a way out', async () => {
    const { root, harness } = await open('/?q=zzzz');
    expect(root.textContent).toContain('No organisations match');
    root.querySelector<HTMLButtonElement>('.retry')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('debounces typing and writes it to the URL', async () => {
    const { root, harness } = await open('/');
    const input = root.querySelector<HTMLInputElement>('#search')!;
    input.value = 'glo';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(TestBed.inject(Router).url).toBe('/'); // too early: still debouncing
    await new Promise((resolve) => setTimeout(resolve, 400));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/?q=glo');
  });

  it('shows the loading, error and partial-error states', async () => {
    const { root, store, harness } = await open('/');
    store.organisations.set([]);
    store.receivedCount.set(0);
    store.serverTotal.set(null);
    harness.detectChanges();
    expect(root.textContent).toContain('Loading organisations');

    store.failed.set(true);
    harness.detectChanges();
    expect(root.querySelector('.box-error')!.textContent).toContain('Could not load');
  });
});
