import { useMemo } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { CourseFile, CourseFolder, TermId } from '@/services/lms/types/lms.types';
import {
  areaFolderAutoKey,
  findFolderByAutoKey,
  moduleFolderAutoKey,
  resolveFiledSourceLabel,
} from '@/utils/autoFolder';
import { normalizeTermId } from '@/utils/gradingTerms';
import { TERM_LABELS } from '@/components/shared/TermSelect';

export const ACTIVITIES_ROOT_FOLDER_ID = 'vf-activities';
export const activitiesTermFolderId = (term: TermId): string => `vf-activities-${term}`;
const TERM_ORDER: TermId[] = ['prelim', 'midterm', 'finals'];

export type AggregatedCourseFile = CourseFile & {
  source: string;
  sourceLabel: string;
};

export const detectFileType = (nameOrUrl: string): CourseFile['type'] => {
  const lower = (nameOrUrl || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.svg')
  )
    return 'image';
  if (
    lower.endsWith('.zip') ||
    lower.endsWith('.tar') ||
    lower.endsWith('.gz') ||
    lower.endsWith('.rar') ||
    lower.endsWith('.7z')
  )
    return 'archive';
  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.py') ||
    lower.endsWith('.json') ||
    lower.endsWith('.html') ||
    lower.endsWith('.css')
  )
    return 'code';
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'slide';
  return 'document';
};

export const useCourseFiles = (courseId?: string) => {
  const { db, activeUser } = useLMS();

  const isPersonal = !courseId || courseId === 'personal';
  const effectiveScopeId = isPersonal ? `user-${activeUser.id}` : courseId;

  const { allFiles, virtualFolders } = useMemo<{
    allFiles: AggregatedCourseFile[];
    virtualFolders: CourseFolder[];
  }>(() => {
    if (!db) return { allFiles: [], virtualFolders: [] };

    const folders = db.courseFolders || [];
    const scopeModules = isPersonal
      ? db.modules || []
      : (db.modules || []).filter((m: any) => m.courseId === courseId);

    // Module item linkage (same conventions as AddModuleItemPage):
    // classic activity -> item.activityId, question set -> the synthetic
    // `asg-activity-<id>`, quiz -> item.quizId.
    const findLinkedModuleId = (pred: (item: any) => boolean): string | null => {
      for (const mod of scopeModules) {
        for (const item of (mod as any).items || []) {
          if (pred(item)) return (mod as any).id;
        }
      }
      return null;
    };

    // Module-linked assessment entries live inside their source module's
    // folder (module:<id>), falling back to the Modules area folder when
    // the child folder isn't cached yet.
    const folderIdForModule = (moduleId: string | null): string | null => {
      if (!moduleId) return null;
      const scopeId = effectiveScopeId as string;
      const child = findFolderByAutoKey(folders, scopeId, moduleFolderAutoKey(moduleId));
      if (child) return (child as any).id;
      const area = findFolderByAutoKey(folders, scopeId, areaFolderAutoKey('modules'));
      return area ? (area as any).id : null;
    };

    // 1. Direct course files
    const directFiles: AggregatedCourseFile[] = (db.courseFiles || [])
      .filter(f =>
        isPersonal ? f.courseId === effectiveScopeId : f.courseId === courseId || f.courseId === effectiveScopeId
      )
      .map(f => {
        const area = (f as CourseFile).sourceArea;
        return {
          ...f,
          source: area === 'announcements' ? 'announcements' : area === 'modules' ? 'modules' : 'uploads',
          sourceLabel: resolveFiledSourceLabel(f, db.announcements || [], db.modules || [])
        };
      });

    // 2. Module uploaded files and images
    const moduleFiles: AggregatedCourseFile[] = [];
    const relevantModules = isPersonal ? db.modules : (db.modules || []).filter(m => m.courseId === courseId);
    relevantModules.forEach(mod => {
      (mod.items || []).forEach(item => {
        if (item.fileName || item.fileUrl) {
          const fName = item.fileName || item.title || 'Module_Asset.pdf';
          const fUrl = item.fileUrl || `/public/uploads/${fName}`;
          moduleFiles.push({
            id: `mod-file-${item.id}`,
            courseId: mod.courseId,
            folderId: null,
            name: fName,
            size: 1024 * 1024,
            formattedSize: item.fileSize || '1.2 MB',
            type: detectFileType(fName || fUrl),
            visibility: item.published ? 'published' : 'unpublished',
            updatedAt: new Date().toISOString(),
            uploadedBy: 'faculty',
            uploadedByName: 'Course Faculty',
            url: fUrl,
            fileUrl: fUrl,
            content: item.content,
            source: 'modules',
            sourceLabel: `Module: ${mod.title}`
          });
        }
      });
    });

    // 3. Announcements attached files and images
    const announcementFiles: AggregatedCourseFile[] = [];
    const relevantAnnouncements = isPersonal
      ? db.announcements || []
      : (db.announcements || []).filter(a => a.courseId === courseId || a.courseId === 'all');
    relevantAnnouncements.forEach(ann => {
      if (ann.attachments && ann.attachments.length > 0) {
        ann.attachments.forEach((att, idx) => {
          const aUrl = att.url || `/public/uploads/${att.name}`;
          announcementFiles.push({
            id: `ann-file-${ann.id}-${idx}`,
            courseId: ann.courseId,
            folderId: null,
            name: att.name,
            size: 1024 * 1024,
            formattedSize: att.size || '850 KB',
            type: detectFileType(att.name || aUrl),
            visibility: 'published',
            updatedAt: ann.createdAt || new Date().toISOString(),
            uploadedBy: ann.authorId,
            uploadedByName: ann.authorName || 'Instructor',
            url: aUrl,
            fileUrl: aUrl,
            content: ann.content,
            source: 'announcements',
            sourceLabel: `Announcement: ${ann.title}`
          });
        });
      }
    });

    // 4. Activities attached starter files and student file submissions
    // (classic format rows live in db.activities after the merge).
    const activityFiles: AggregatedCourseFile[] = [];
    const relevantClassicActivities = (
      isPersonal ? db.activities || [] : (db.activities || []).filter(a => a.courseId === courseId)
    ).filter(a => a.format === 'classic');
    // Page-created (unlinked) activities file under Activities/{Term}.
    // Module-linked ones keep their module-folder placement above.
    const unlinkedTerms = new Set<TermId>();
    const activityFolderId = (term: TermId | null | undefined, moduleId: string | null): string => {
      if (moduleId) return folderIdForModule(moduleId) ?? activitiesTermFolderId(term ?? 'midterm');
      const resolved = term ?? 'midterm';
      unlinkedTerms.add(resolved);
      return activitiesTermFolderId(resolved);
    };

    relevantClassicActivities.forEach(act => {
      const actTerm: TermId = normalizeTermId(act.term) ?? 'midterm';
      const actFolderId = activityFolderId(
        actTerm,
        findLinkedModuleId(item => item.activityId === act.id)
      );
      if (act.fileName || act.fileUrl) {
        const actUrl = act.fileUrl || `/public/uploads/${act.fileName}`;
        activityFiles.push({
          id: `act-file-${act.id}`,
          courseId: act.courseId,
          folderId: actFolderId,
          name: act.fileName || `${act.title}_Handout.pdf`,
          size: 1024 * 1024,
          formattedSize: act.fileSize || '1.5 MB',
          type: detectFileType(act.fileName || actUrl),
          visibility: act.published ? 'published' : 'unpublished',
          updatedAt: act.dueDate || new Date().toISOString(),
          uploadedBy: 'faculty',
          uploadedByName: 'Course Faculty',
          url: actUrl,
          fileUrl: actUrl,
          content: act.instructions,
          source: 'activities',
          sourceLabel: `Activity: ${act.title}`
        });
      }

      // Virtual entry so every classic activity counts in Files even with
      // no starter file attached (e.g. created via Add module item).
      if (!act.fileName && !act.fileUrl) {
        activityFiles.push({
          id: `asg-virtual-${act.id}`,
          courseId: act.courseId,
          folderId: actFolderId,
          name: (act.title || 'Untitled activity').trim() || 'Untitled activity',
          size: 0,
          formattedSize: 'Assessment',
          type: 'document',
          visibility: act.published ? 'published' : 'unpublished',
          updatedAt: act.dueDate || new Date().toISOString(),
          uploadedBy: 'faculty',
          uploadedByName: 'Course Faculty',
          url: undefined,
          fileUrl: undefined,
          content: act.instructions,
          source: 'activities',
          sourceLabel: `Activity: ${act.title}`
        });
      }

      const relevantSubs = (db.submissions || []).filter(
        s => s.activityKey === act.id && (s.fileName || s.fileUrl)
      );
      relevantSubs.forEach(sub => {
        const subUrl = sub.fileUrl || (sub.fileName ? `/public/uploads/${sub.fileName}` : undefined);
        activityFiles.push({
          id: `sub-file-${sub.id}`,
          courseId: act.courseId,
          folderId: null,
          name: sub.fileName || `${sub.studentName}_Submission.pdf`,
          size: 1024 * 1024,
          formattedSize: '1.8 MB',
          type: detectFileType(sub.fileName || subUrl || 'file.pdf'),
          visibility: 'published',
          updatedAt: sub.submittedAt || new Date().toISOString(),
          uploadedBy: sub.studentId,
          uploadedByName: sub.studentName,
          url: subUrl,
          fileUrl: subUrl,
          content: sub.content,
          source: 'activities',
          sourceLabel: `Student Submission (${sub.studentName})`
        });
      });
    });

    // 4b. Question-set activities (non-classic db.activities rows) aggregate
    // as virtual entries so the Files Activities tab counts quiz-style sets
    // made via Add module item.
    const relevantQuestionSets = (
      isPersonal ? db.activities || [] : (db.activities || []).filter((a: any) => a.courseId === courseId)
    ).filter((a: any) => a.format !== 'classic');
    relevantQuestionSets.forEach((act: any) => {
      const actTerm: TermId = normalizeTermId(act.term) ?? 'midterm';
      activityFiles.push({
        id: `act-virtual-${act.id}`,
        courseId: act.courseId,
        folderId: activityFolderId(
          actTerm,
          findLinkedModuleId(item => item.activityId === `asg-activity-${act.id}`)
        ),
        name: (act.title || 'Untitled question set').trim() || 'Untitled question set',
        size: 0,
        formattedSize: 'Assessment',
        type: 'document',
        visibility: act.published ? 'published' : 'unpublished',
        updatedAt: act.dueDate || new Date().toISOString(),
        uploadedBy: 'faculty',
        uploadedByName: 'Course Faculty',
        url: undefined,
        fileUrl: undefined,
        content: act.instructions,
        source: 'activities',
        sourceLabel: `Activity: ${act.title} (Question set)`
      });
    });

    // Quizzes save no files on the system, so nothing quiz-sourced is
    // aggregated here (no Quizzes tab on the Files page).

    // Synthetic Activities area: an `Activities` root plus one child per
    // grading term that holds page-created (module-unlinked) activities —
    // i.e. Activities/{Prelim,Midterm,Finals}. Only synthesized for terms
    // that actually hold entries, so no empty folders are promised.
    const nowIso = new Date().toISOString();
    const scopeId = (effectiveScopeId as string) ?? (courseId as string);
    const virtualFolders: CourseFolder[] =
      unlinkedTerms.size === 0
        ? []
        : [
            {
              id: ACTIVITIES_ROOT_FOLDER_ID,
              courseId: scopeId,
              parentId: null,
              name: 'Activities',
              updatedAt: nowIso,
              autoKey: 'area:activities',
            },
            ...TERM_ORDER.filter(t => unlinkedTerms.has(t)).map(
              (t): CourseFolder => ({
                id: activitiesTermFolderId(t),
                courseId: scopeId,
                parentId: ACTIVITIES_ROOT_FOLDER_ID,
                name: TERM_LABELS[t],
                updatedAt: nowIso,
                autoKey: `activities-term:${t}`,
              })
            ),
          ];

    const combinedRawFiles = [
      ...directFiles,
      ...moduleFiles,
      ...announcementFiles,
      ...activityFiles
    ];

    const seenFileKeys = new Set<string>();
    const deduped = combinedRawFiles.filter(item => {
      const key = `${item.name}-${item.url || item.fileUrl || item.id}`;
      if (seenFileKeys.has(key)) return false;
      seenFileKeys.add(key);
      return true;
    });
    return { allFiles: deduped, virtualFolders };
  }, [db, isPersonal, effectiveScopeId, courseId]);

  const sourceCounts = useMemo(
    () => ({
      all: allFiles.length,
      modules: allFiles.filter(f => f.source === 'modules').length,
      announcements: allFiles.filter(f => f.source === 'announcements').length,
      activities: allFiles.filter(f => f.source === 'activities').length,
      uploads: allFiles.filter(f => f.source === 'uploads').length
    }),
    [allFiles]
  );

  return { isPersonal, effectiveScopeId, allFiles, virtualFolders, sourceCounts, detectFileType };
};