import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { TranslateService } from './core/translate.service';

/** Page titles also come from en.json, so even the browser tab is translatable. */
const title = (key: string) => () => inject(TranslateService).t(key);

export const routes: Routes = [
  {
    path: '',
    title: title('list.title'),
    loadComponent: () => import('./features/org-list/org-list').then((m) => m.OrgList),
  },
  {
    path: 'new',
    title: title('form.title'),
    loadComponent: () => import('./features/org-create/org-create').then((m) => m.OrgCreate),
  },
  { path: '**', redirectTo: '' },
];
