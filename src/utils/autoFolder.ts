// src/utils/autoFolder.ts
export type FileSourceArea = 'announcements' | 'modules' | 'syllabus';

export function areaFolderName(area: FileSourceArea): string {
  if (area === 'announcements') return 'Announcements';
  if (area === 'modules') return 'Modules';
  return 'Syllabus';
}

export function areaFolderAutoKey(area: FileSourceArea): string {
  return `area:${area}`;
}

export function moduleFolderAutoKey(moduleId: string): string {
  return `module:${moduleId}`;
}

export function findFolderByAutoKey<T extends { courseId: string; autoKey?: string }>(
  folders: T[],
  courseId: string,
  autoKey: string
): T | undefined {
  return folders.find(f => f.courseId === courseId && f.autoKey === autoKey);
}

export function dedupeFileName(name: string, existingNames: string[]): string {
  if (!existingNames.includes(name)) return name;
  const dot = name.lastIndexOf('.');
  const hasExt = dot > 0;
  const base = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : '';
  let n = 2;
  let candidate = `${base} (${n})${ext}`;
  while (existingNames.includes(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  return candidate;
}

export function resolveFiledSourceLabel(
  file: { sourceArea?: string; sourceId?: string },
  announcements: { id: string; title: string }[],
  modules: { title: string; items: { id: string }[] }[]
): string {
  if (file.sourceArea === 'announcements') {
    const ann = announcements.find(a => a.id === file.sourceId);
    return ann ? `Announcement: ${ann.title}` : 'Source deleted';
  }
  if (file.sourceArea === 'modules') {
    const mod = modules.find(m => (m.items || []).some(i => i.id === file.sourceId));
    return mod ? `Module: ${mod.title}` : 'Source deleted';
  }
  if (file.sourceArea === 'syllabus') return 'Syllabus';
  return 'Direct Upload';
}

export function isFolderEmptyRecursive(
  folders: { id: string; parentId?: string | null }[],
  files: { folderId?: string | null }[],
  folderId: string
): boolean {
  const descendantIds = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && descendantIds.has(f.parentId) && !descendantIds.has(f.id)) {
        descendantIds.add(f.id);
        grew = true;
      }
    }
  }
  return !files.some(f => f.folderId && descendantIds.has(f.folderId));
}
