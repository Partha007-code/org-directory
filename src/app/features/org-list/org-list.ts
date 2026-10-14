import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Organisation, SELECTABLE_STATUSES, Status } from '../../core/organisation.model';
import { OrganisationStore } from '../../core/organisation-store';
import { TranslatePipe } from '../../core/translate.pipe';
import { StatusBadge } from '../../shared/status-badge/status-badge';

type SortKey = 'name' | 'created';
type SortDir = 'asc' | 'desc';
type StatusFilter = Status | 'all';

const SEARCH_DEBOUNCE_MS = 300;
const FILTERABLE_STATUSES: readonly Status[] = [...SELECTABLE_STATUSES, 'unknown'];
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

@Component({
  selector: 'app-org-list',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, StatusBadge, TranslatePipe],
  templateUrl: './org-list.html',
  styleUrl: './org-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgList implements OnInit {
  protected readonly store = inject(OrganisationStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly statusOptions = FILTERABLE_STATUSES;

  // ---- the URL is the single source of truth for search / filter / sort ----
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly query = computed(() => this.params().get('q') ?? '');
  protected readonly statusFilter = computed<StatusFilter>(() => {
    const value = this.params().get('status');
    return FILTERABLE_STATUSES.find((status) => status === value) ?? 'all';
  });
  protected readonly sortKey = computed<SortKey>(() =>
    this.params().get('sort') === 'name' ? 'name' : 'created',
  );
  protected readonly sortDir = computed<SortDir>(() =>
    this.params().get('dir') === 'asc' ? 'asc' : 'desc',
  );

  // ---- what the table shows ----
  protected readonly visible = computed(() => {
    const text = this.query().toLowerCase();
    const status = this.statusFilter();
    const matches = this.store
      .organisations()
      .filter(
        (org) =>
          (status === 'all' || org.status === status) &&
          (text === '' || (org.name ?? '').toLowerCase().includes(text)),
      );
    return sortOrganisations(matches, this.sortKey(), this.sortDir());
  });

  protected readonly hasActiveFilters = computed(
    () => this.query() !== '' || this.statusFilter() !== 'all',
  );

  // ---- the search box (typed + non-nullable) ----
  protected readonly searchControl = new FormControl(this.query(), { nonNullable: true });
  private lastPushedQuery = this.query();

  constructor() {
    // typing -> wait 300 ms -> write to the URL
    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((text) => {
        this.lastPushedQuery = text.trim();
        this.updateUrl({ q: text.trim() || null });
      });

    // URL changed from outside (back button, pasted link) -> update the search box.
    // lastPushedQuery stops us from overwriting what the user is still typing.
    effect(() => {
      const query = this.query();
      if (query !== this.lastPushedQuery) {
        this.lastPushedQuery = query;
        this.searchControl.setValue(query, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected setStatus(value: string): void {
    this.updateUrl({ status: value === 'all' ? null : value });
  }

  protected sortBy(key: SortKey): void {
    // clicking the active column flips the direction; a new column starts ascending
    const dir: SortDir = this.sortKey() === key && this.sortDir() === 'asc' ? 'desc' : 'asc';
    this.updateUrl({ sort: key, dir });
  }

  protected clearFilters(): void {
    this.lastPushedQuery = '';
    this.searchControl.setValue('', { emitEvent: false });
    // this.updateUrl({ q: null, status: null });
    this.updateUrl({ q: null, status: null, sort: null, dir: null });
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIndicator(key: SortKey): string {
    return this.sortKey() === key ? 'list.sort.' + this.sortDir() : 'list.sort.none';
  }

  protected dismissCreated(): void {
    this.store.lastCreatedName.set(null);
  }

  protected retry(): void {
    void this.store.load();
  }

  private updateUrl(changes: Params): void {
    // `null` removes the parameter from the URL, everything else is kept (merge)
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: changes,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

// ---------- sorting ----------

function sortOrganisations(list: Organisation[], key: SortKey, dir: SortDir): Organisation[] {
  const sign = dir === 'asc' ? 1 : -1;
  const sorted = [...list]; // never sort the store's array in place
  if (key === 'name') {
    sorted.sort((a, b) => compare(a.name, b.name, (x, y) => collator.compare(x, y), sign));
  } else {
    sorted.sort((a, b) =>
      compare(a.createdAt?.getTime() ?? null, b.createdAt?.getTime() ?? null, (x, y) => x - y, sign),
    );
  }
  return sorted;
}

/** Compares two values. Missing values (null) always go to the bottom, in both directions. */
function compare<T>(a: T | null, b: T | null, order: (x: T, y: T) => number, sign: number): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return order(a, b) * sign;
}
