export interface AcademicTermOption {
  value: string;
  label: string;
  detail: string;
  group: 'current' | 'short' | 'previous';
  groupLabel: string;
  isCurrent?: boolean;
}

export function getCurrentAcademicYearStart(now: Date = new Date()): number {
  return now.getFullYear();
}

export function formatAY(startYear: number): string {
  return `AY ${startYear}-${startYear + 1}`;
}

/**
 * Builds the Academic Term dropdown options.
 * Order (per requirements):
 *  1. Current AY regular semesters at the very top (1st + 2nd Sem)
 *  2. Just below: Midyear / Summer + Special Term for the current AY
 *  3. Previous academic years (newest first) for backdating / history
 */
export function getAcademicTermOptions(now: Date = new Date(), previousYearsCount = 4): AcademicTermOption[] {
  const y = getCurrentAcademicYearStart(now);
  const ay = formatAY(y);

  const options: AcademicTermOption[] = [
    {
      value: `1st Sem ${ay}`,
      label: `1st Sem ${ay}`,
      detail: 'Aug – Dec · First Semester',
      group: 'current',
      groupLabel: `${ay} · Current`,
      isCurrent: true,
    },
    {
      value: `2nd Sem ${ay}`,
      label: `2nd Sem ${ay}`,
      detail: 'Jan – May · Second Semester',
      group: 'current',
      groupLabel: `${ay} · Current`,
      isCurrent: true,
    },
    {
      value: `Midyear / Summer ${y + 1}`,
      label: `Midyear / Summer ${y + 1}`,
      detail: `Jun – Jul · Short term · ${ay}`,
      group: 'short',
      groupLabel: 'Short terms',
    },
    {
      value: 'Special Term',
      label: 'Special Term',
      detail: `Flexible term · ${ay}`,
      group: 'short',
      groupLabel: 'Short terms',
    },
  ];

  for (let i = 1; i <= previousYearsCount; i++) {
    const start = y - i;
    const prevAY = formatAY(start);
    options.push(
      {
        value: `1st Sem ${prevAY}`,
        label: `1st Sem ${prevAY}`,
        detail: 'Aug – Dec · First Semester',
        group: 'previous',
        groupLabel: 'Previous academic years',
      },
      {
        value: `2nd Sem ${prevAY}`,
        label: `2nd Sem ${prevAY}`,
        detail: 'Jan – May · Second Semester',
        group: 'previous',
        groupLabel: 'Previous academic years',
      },
      {
        value: `Midyear / Summer ${start + 1}`,
        label: `Midyear / Summer ${start + 1}`,
        detail: `Jun – Jul · ${prevAY}`,
        group: 'previous',
        groupLabel: 'Previous academic years',
      },
    );
  }

  return options;
}

export function getDefaultAcademicTerm(now: Date = new Date()): string {
  return `1st Sem ${formatAY(getCurrentAcademicYearStart(now))}`;
}
