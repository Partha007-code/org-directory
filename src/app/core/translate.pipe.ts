import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from './translate.service';

/** Usage in templates:  {{ 'list.title' | t }}   or   {{ 'list.summary' | t: { shown: 3, total: 10 } }} */
@Pipe({ name: 't' })
export class TranslatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.translate.t(key, params);
  }
}
