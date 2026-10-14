import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EMAIL_PATTERN } from '../../core/organisation.mapper';
import { SELECTABLE_STATUSES, Status } from '../../core/organisation.model';
import { OrganisationStore } from '../../core/organisation-store';
import { TranslatePipe } from '../../core/translate.pipe';
import { organisationName } from './validators';

type FieldName = 'name' | 'status' | 'ownerEmail' | 'memberCount';
const FIELDS: readonly FieldName[] = ['name', 'status', 'ownerEmail', 'memberCount'];

@Component({
  selector: 'app-org-create',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './org-create.html',
  styleUrl: './org-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgCreate implements OnInit {
  protected readonly store = inject(OrganisationStore);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  protected readonly statuses = SELECTABLE_STATUSES;
  protected readonly submitted = signal(false);

  /**
   * Every control is non-nullable (reset() goes back to '', never to null).
   * updateOn: 'blur' means validation runs when the user LEAVES a field,
   * not on every keystroke — that is the "errors on blur" requirement.
   * (Pressing Enter still validates: Angular flushes pending values on submit.)
   */
  protected readonly form = this.fb.group({
    name: this.fb.control('', {
      validators: [organisationName((name) => this.store.isNameTaken(name))],
      updateOn: 'blur',
    }),
    status: this.fb.control<Status | ''>('', { validators: [Validators.required] }),
    ownerEmail: this.fb.control('', {
      validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)],
      updateOn: 'blur',
    }),
    // Kept as text so the control stays non-nullable; converted to a number on submit.
    memberCount: this.fb.control('', {
      validators: [Validators.pattern(/^\d+$/)],
      updateOn: 'blur',
    }),
  });

  ngOnInit(): void {
    // We need the existing names to check uniqueness, so make sure they are loading.
    void this.store.load();
  }

  /** Translation key of the field's error, or null. Only shown once the user has left the field. */
  protected errorKey(field: FieldName): string | null {
    const control = this.form.controls[field];
    if (!control.invalid || !control.touched) return null;
    const firstError = Object.keys(control.errors ?? {})[0];
    return `form.error.${field}.${firstError}`;
  }

  /** The list for the error summary box shown after a failed submit. */
  protected summaryItems(): { field: FieldName; key: string }[] {
    return FIELDS.flatMap((field) => {
      const key = this.errorKey(field);
      return key ? [{ field, key }] : [];
    });
  }

  protected focusField(field: FieldName): void {
    document.getElementById(`field-${field}`)?.focus();
  }

  protected submit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched(); // reveal every error at once
      const firstInvalid = FIELDS.find((field) => this.form.controls[field].invalid);
      if (firstInvalid) this.focusField(firstInvalid);
      return;
    }

    const value = this.form.getRawValue();
    if (value.status === '') return; // cannot happen (required), but narrows the type

    this.store.add({
      uid: `new-${Date.now()}`,
      id: this.store.nextId(),
      name: value.name.trim(),
      status: value.status,
      memberCount: value.memberCount === '' ? null : Number(value.memberCount),
      ownerEmail: value.ownerEmail.trim(),
      ownerEmailValid: true,
      createdAt: new Date(),
    });
    void this.router.navigateByUrl('/');
  }
}
