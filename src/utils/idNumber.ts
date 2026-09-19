/**
 * Institutional ID Number formatting.
 *
 * Official format: XXX-XXXX-X (8 digits, e.g. 231-1082-3)
 */

export const ID_NUMBER_PATTERN = /^\d{3}-\d{4}-\d$/;

export const ID_NUMBER_EXAMPLE = '231-1082-3';

export function formatIdNumber(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isValidIdNumber(value: string): boolean {
  return ID_NUMBER_PATTERN.test(value.trim());
}
