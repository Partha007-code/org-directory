import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OrganisationStore } from '../../core/organisation-store';
import { toOrganisation } from '../../core/organisation.mapper';
import { OrgCreate } from './org-create';

function setup() {
  const store = TestBed.inject(OrganisationStore);
  vi.spyOn(store, 'load').mockResolvedValue();
  store.organisations.set([toOrganisation({ id: 1, name: 'Northwind Traders' }, 0)]);
  const fixture = TestBed.createComponent(OrgCreate);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  const input = (id: string) => root.querySelector<HTMLInputElement>(`#field-${id}`)!;
  const type = (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
  };
  const blur = (id: string) => {
    input(id).dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  return { fixture, root, store, input, type, blur };
}

describe('OrgCreate form', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('shows an error on blur, not while typing', () => {
    const { fixture, root, type, blur } = setup();
    type('name', 'ab');
    fixture.detectChanges();
    expect(root.querySelector('#error-name')!.textContent!.trim()).toBe(''); // still typing: silent
    blur('name');
    expect(root.querySelector('#error-name')!.textContent).toContain('at least 3 characters');
  });

  it('rejects a duplicate name, case-insensitively', () => {
    const { root, type, blur } = setup();
    type('name', '  NORTHWIND traders ');
    blur('name');
    expect(root.querySelector('#error-name')!.textContent).toContain('already exists');
  });

  it('rejects a bad email and a negative member count', () => {
    const { root, type, blur } = setup();
    type('ownerEmail', 'not-an-email');
    blur('ownerEmail');
    type('memberCount', '-3');
    blur('memberCount');
    expect(root.querySelector('#error-ownerEmail')!.textContent).toContain('valid email');
    expect(root.querySelector('#error-memberCount')!.textContent).toContain('whole number');
  });

  it('submitting an empty form shows a summary, field errors, and creates nothing', () => {
    const { fixture, root, store } = setup();
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(root.querySelector('.summary')!.querySelectorAll('li').length).toBe(3); // name, status, email
    expect(root.querySelector('#error-status')!.textContent).toContain('Choose a status');
    expect(store.organisations().length).toBe(1);
  });

  it('creates the organisation (optional member count left empty) and goes back to the list', async () => {
    const { fixture, root, store, type, blur } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    type('name', 'Brand New Org');
    blur('name');
    const select = root.querySelector<HTMLSelectElement>('#field-status')!;
    select.value = 'active';
    select.dispatchEvent(new Event('change'));
    type('ownerEmail', 'boss@new.example');
    blur('ownerEmail');
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const created = store.organisations()[0];
    expect(created.name).toBe('Brand New Org');
    expect(created.status).toBe('active');
    expect(created.memberCount).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
