import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const NAME_MIN = 3;
export const NAME_MAX = 80;

/**
 * One validator for the name field. It trims first, so "   " counts as empty
 * and "  ab  " counts as 2 characters. Only the first problem is reported.
 */
export function organisationName(isTaken: (name: string) => boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const name = String(control.value).trim();
    if (name === '') return { required: true };
    if (name.length < NAME_MIN) return { tooShort: true };
    if (name.length > NAME_MAX) return { tooLong: true };
    if (isTaken(name)) return { duplicate: true };
    return null;
  };
}
