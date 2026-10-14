import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, map, shareReplay, switchMap, throwError, timer } from 'rxjs';
import { RawOrganisation } from './organisation.model';

/** The API's rules (from the assignment). The store imports these too. */
export const MAX_PAGE_SIZE = 25;
export const MAX_REQUESTS_PER_MINUTE = 5;
export const ONE_MINUTE_MS = 60_000;

const FAILURE_RATE = 0.15;
const MIN_DELAY_MS = 400;
const MAX_DELAY_MS = 900;

export interface PageResult {
  items: RawOrganisation[];
  total: number;
  page: number;
}

export class ApiError extends Error {
  constructor(
    readonly kind: 'server' | 'rate-limited',
    readonly retryAfterMs = 0,
  ) {
    super(kind);
  }
}

/**
 * A fake backend living in the browser. It behaves like the real API would:
 *  - max 25 records per request (asking for more is silently capped)
 *  - 5 requests per minute (the 6th gets a "rate-limited" error)
 *  - 400-900 ms delay, ~15% random failures
 * The raw fixture file is served untouched from /data/organisations.json.
 */
@Injectable({ providedIn: 'root' })
export class OrganisationApi {
  private readonly http = inject(HttpClient);
  private readonly fixture$ = this.http
    .get<RawOrganisation[]>('data/organisations.json')
    .pipe(shareReplay(1));

  private requestTimes: number[] = [];

  getPage(page: number, limit = MAX_PAGE_SIZE): Observable<PageResult> {
    // defer = run this check when someone subscribes, not when the method is called
    return defer(() => {
      const now = Date.now();
      this.requestTimes = this.requestTimes.filter((time) => now - time < ONE_MINUTE_MS);

      if (this.requestTimes.length >= MAX_REQUESTS_PER_MINUTE) {
        const retryAfterMs = ONE_MINUTE_MS - (now - this.requestTimes[0]);
        return throwError(() => new ApiError('rate-limited', retryAfterMs));
      }
      this.requestTimes.push(now); // failed requests count towards the limit too

      const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
      return timer(delay).pipe(
        switchMap(() =>
          Math.random() < FAILURE_RATE
            ? throwError(() => new ApiError('server'))
            : this.fixture$,
        ),
        map((all) => {
          const size = Math.min(limit, MAX_PAGE_SIZE);
          const start = (page - 1) * size;
          return { items: all.slice(start, start + size), total: all.length, page };
        }),
      );
    });
  }
}
