import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from './core/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="header-inner">
        <span class="brand">{{ 'app.title' | t }}</span>
        <nav [attr.aria-label]="'app.nav.label' | t">
          <!-- <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            {{ 'app.nav.list' | t }}
          </a> -->
          <!-- <a routerLink="/new" routerLinkActive="active">{{ 'app.nav.create' | t }}</a> -->
        </nav>
      </div>
    </header>
    <main class="main">
      <router-outlet />
    </main>
  `,
  styles: `
    .header {
      background: var(--color-brand);
      color: var(--color-brand-contrast);
    }
    .header-inner {
      max-width: var(--content-max-width);
      margin: 0 auto;
      padding: var(--space-3) var(--space-4);
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-lg);
    }
    nav {
      display: flex;
      gap: var(--space-4);
    }
    nav a {
      color: var(--color-brand-contrast);
      padding-bottom: var(--space-1);
      border-bottom: var(--border-width-thick) solid transparent;
    }
    nav a.active {
      border-bottom-color: var(--color-brand-contrast);
    }
    .main {
      display: block;
      max-width: var(--content-max-width);
      margin: 0 auto;
      padding: var(--space-6) var(--space-4);
    }
  `,
})
export class App {}
