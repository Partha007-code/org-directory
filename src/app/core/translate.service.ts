import { Injectable } from '@angular/core';
import en from './en.json';

type Params = Record<string, string | number>;

/**
 * Tiny translation service. All visible text lives in en.json.
 * To add a language: create fr.json, import it here and pick the dictionary by language.
 */
@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly dictionary: unknown = en;

  /** t('list.title') or t('list.summary', { shown: 3, total: 10 }) */
  t(key: string, params: Params = {}): string {
    const text = key
      .split('.')
      .reduce<unknown>(
        (node, part) =>
          typeof node === 'object' && node !== null
            ? (node as Record<string, unknown>)[part]
            : undefined,
        this.dictionary,
      );

    if (typeof text !== 'string') return key; // missing key: show the key so it is easy to spot
    return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
  }
}
