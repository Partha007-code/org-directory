import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Status } from '../../core/organisation.model';
import { TranslatePipe } from '../../core/translate.pipe';

/**
 * CONFLICT 2 — the designer's coloured dot + the accessibility rule "never colour alone".
 * We keep the dot AND add a short text label. On top of that, each status has its own SHAPE,
 * so even the dot works without colour (filled circle / ring / diamond / dashed ring).
 * The dot is decoration (aria-hidden); the text is what screen readers read.
 */
@Component({
  selector: 'app-status-badge',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="dot" [class]="'dot-' + status()" aria-hidden="true"></span>
    <span class="label">{{ 'status.' + status() | t }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      white-space: nowrap;
    }
    .dot {
      --dot-color: var(--status-unknown);
      flex: none;
      width: var(--dot-size);
      height: var(--dot-size);
      border: var(--border-width-thick) solid var(--dot-color);
      background: var(--dot-color);
      border-radius: 50%;
    }
    .dot-active {
      --dot-color: var(--status-active); /* filled circle */
    }
    .dot-inactive {
      --dot-color: var(--status-inactive);
      background: transparent; /* hollow ring */
    }
    .dot-suspended {
      --dot-color: var(--status-suspended);
      border-radius: 0;
      transform: rotate(45deg); /* diamond */
    }
    .dot-unknown {
      background: transparent;
      border-style: dashed; /* dashed ring */
    }
    .label {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
  `,
})
export class StatusBadge {
  readonly status = input.required<Status>();
}
