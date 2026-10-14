import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import fixture from '../../../public/data/organisations.json';
import { OrganisationStore } from './organisation-store';

/** Lets time pass in 1-second steps, answering the fixture request like a web server would. */
async function runClock(http: HttpTestingController, seconds: number, stopWhen: () => boolean) {
  for (let i = 0; i < seconds && !stopWhen(); i++) {
    await vi.advanceTimersByTimeAsync(1000);
    http.match('data/organisations.json').forEach((request) => request.flush(fixture));
  }
}

describe('OrganisationStore (Conflict 1: 25 per request, 5 requests per minute)', () => {
  let store: OrganisationStore;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(OrganisationStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the first pages quickly, then the last page after the rate-limit window', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // no random failures
    void store.load();

    await runClock(http, 10, () => false);
    expect(store.organisations().length).toBe(125); // 5 pages x 25 are already visible
    expect(store.loading()).toBe(true);
    expect(store.waitSeconds()).toBeGreaterThan(0); // and the UI knows it is waiting

    await runClock(http, 70, () => store.isComplete());
    expect(store.organisations().length).toBe(137);
    expect(store.failed()).toBe(false);
  });

  it('survives random server failures by retrying', async () => {
    // fail the first two requests, then behave
    const random = vi.spyOn(Math, 'random');
    random.mockReturnValueOnce(0.5).mockReturnValueOnce(0.01).mockReturnValueOnce(0.01).mockReturnValue(0.5);
    void store.load();
    await runClock(http, 200, () => store.isComplete());
    expect(store.organisations().length).toBe(137);
    expect(store.failed()).toBe(false);
  });

  it('reports an error (and keeps loaded rows) when the server keeps failing', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // always fail
    void store.load();
    await runClock(http, 30, () => !store.loading());
    expect(store.failed()).toBe(true);
    expect(store.view()).toBe('error');
  });

  it('finds duplicate names regardless of case', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    void store.load();
    await runClock(http, 10, () => false);
    expect(store.isNameTaken('NORTHWIND traders')).toBe(true);
    expect(store.isNameTaken('Brand New Name')).toBe(false);
  });
});
