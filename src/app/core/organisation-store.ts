import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toOrganisation } from './organisation.mapper';
import { Organisation } from './organisation.model';
import {
  ApiError,
  MAX_PAGE_SIZE,
  MAX_REQUESTS_PER_MINUTE,
  ONE_MINUTE_MS,
  OrganisationApi,
} from './organisation-api';

const MAX_ATTEMPTS_PER_PAGE = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Holds all organisations for the whole app and loads them page by page in the background.
 * Because it is a root service, the data is fetched once and reused when you navigate around.
 */
@Injectable({ providedIn: 'root' })
export class OrganisationStore {
  private readonly api = inject(OrganisationApi);

  // ---- state (signals) ----
  readonly organisations = signal<Organisation[]>([]);
  /** How many records the server told us exist. */
  readonly serverTotal = signal<number | null>(null);
  /** How many of those we have received so far (excludes organisations created locally). */
  readonly receivedCount = signal(0);
  readonly loading = signal(false);
  /** True when we gave up on a page. Already loaded data stays visible. */
  readonly failed = signal(false);
  /** > 0 while we are waiting for the rate limit to free up. */
  readonly waitSeconds = signal(0);
  /** Message shown once on the list after creating an organisation. */
  readonly lastCreatedName = signal<string | null>(null);

  private pagesLoaded = 0;
  private sentAt: number[] = []; // our own record of when we called the API

  // ---- derived state ----
  readonly isComplete = computed(
    () => this.serverTotal() !== null && this.receivedCount() >= this.serverTotal()!,
  );

  /** One word for the page to switch on: which screen should we show? */
  readonly view = computed<'loading' | 'error' | 'ready'>(() => {
    if (this.organisations().length > 0 || this.isComplete()) return 'ready';
    return this.failed() ? 'error' : 'loading';
  });

  private readonly takenNames = computed(
    () =>
      new Set(
        this.organisations()
          .map((org) => org.name?.toLowerCase())
          .filter((name): name is string => !!name),
      ),
  );

  // ---- actions ----

  /** Loads (or resumes loading) every page. Safe to call many times. */
  async load(): Promise<void> {
    if (this.loading() || this.isComplete()) return;
    this.loading.set(true);
    this.failed.set(false);

    try {
      while (!this.isComplete()) {
        const page = this.pagesLoaded + 1;
        const result = await this.fetchPage(page);
        const offset = (page - 1) * MAX_PAGE_SIZE;
        const loaded = result.items.map((raw, index) => toOrganisation(raw, offset + index));

        // Show records as soon as each page arrives, do not wait for the last page.
        this.organisations.update((list) => [...list, ...loaded]);
        this.receivedCount.update((count) => count + loaded.length);
        this.serverTotal.set(result.total);
        this.pagesLoaded = page;

        if (result.items.length === 0) break; // safety: never loop forever
      }
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  add(organisation: Organisation): void {
    this.organisations.update((list) => [organisation, ...list]);
    this.lastCreatedName.set(organisation.name);
  }

  /** Case-insensitive. Only knows about records loaded so far. */
  isNameTaken(name: string): boolean {
    return this.takenNames().has(name.trim().toLowerCase());
  }

  nextId(): number {
    return Math.max(0, ...this.organisations().map((org) => org.id ?? 0)) + 1;
  }

  // ---- loading helpers ----

  private async fetchPage(page: number) {
    for (let attempt = 1; ; attempt++) {
      await this.waitForRequestBudget();
      try {
        return await firstValueFrom(this.api.getPage(page));
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'rate-limited') {
          await this.countdown(error.retryAfterMs); // someone else used our budget: wait, then try again
          attempt--; // being rate limited is not the page's fault, so it is not a "failed attempt"
        } else if (attempt >= MAX_ATTEMPTS_PER_PAGE) {
          throw error;
        } else {
          await sleep(500 * attempt); // short pause before retrying
        }
      }
    }
  }

  /** We may only send 5 requests per minute. Wait here instead of sending a request that will be rejected. */
  private async waitForRequestBudget(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.sentAt = this.sentAt.filter((time) => now - time < ONE_MINUTE_MS);
      if (this.sentAt.length < MAX_REQUESTS_PER_MINUTE) break;
      await this.countdown(ONE_MINUTE_MS - (now - this.sentAt[0]));
    }
    this.sentAt.push(Date.now());
  }

  /** Waits `ms` while updating `waitSeconds` every second so the UI can show a countdown. */
  private async countdown(ms: number): Promise<void> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      this.waitSeconds.set(Math.ceil((end - Date.now()) / 1000));
      await sleep(Math.min(1000, end - Date.now()));
    }
    this.waitSeconds.set(0);
  }
}
