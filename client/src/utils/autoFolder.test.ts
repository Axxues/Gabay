// src/utils/autoFolder.test.ts
import { describe, expect, it } from 'vitest';
import {
  areaFolderAutoKey,
  areaFolderName,
  dedupeFileName,
  findFolderByAutoKey,
  isFolderEmptyRecursive,
  moduleFolderAutoKey,
  resolveFiledSourceLabel,
} from './autoFolder';

describe('area folders', () => {
  it('names the three area folders', () => {
    expect(areaFolderName('announcements')).toBe('Announcements');
    expect(areaFolderName('modules')).toBe('Modules');
    expect(areaFolderName('syllabus')).toBe('Syllabus');
  });
  it('builds stable auto keys', () => {
    expect(areaFolderAutoKey('announcements')).toBe('area:announcements');
    expect(moduleFolderAutoKey('mod-1')).toBe('module:mod-1');
  });
  it('finds folders by auto key within a course', () => {
    const folders = [
      { id: 'f1', courseId: 'c1', autoKey: 'area:announcements' },
      { id: 'f2', courseId: 'c2', autoKey: 'area:announcements' },
    ];
    expect(findFolderByAutoKey(folders, 'c1', 'area:announcements')?.id).toBe('f1');
    expect(findFolderByAutoKey(folders, 'c1', 'area:modules')).toBeUndefined();
  });
});

describe('dedupeFileName', () => {
  it('keeps names with no conflict', () => {
    expect(dedupeFileName('report.pdf', [])).toBe('report.pdf');
  });
  it('suffixes the first duplicate before the extension', () => {
    expect(dedupeFileName('report.pdf', ['report.pdf'])).toBe('report (2).pdf');
  });
  it('increments past taken suffixes', () => {
    expect(dedupeFileName('report.pdf', ['report.pdf', 'report (2).pdf'])).toBe('report (3).pdf');
  });
  it('suffixes extensionless names at the end', () => {
    expect(dedupeFileName('notes', ['notes'])).toBe('notes (2)');
  });
});

describe('resolveFiledSourceLabel', () => {
  it('labels live announcements and survives renames', () => {
    expect(
      resolveFiledSourceLabel({ sourceArea: 'announcements', sourceId: 'a1' }, [{ id: 'a1', title: 'Week 3 Memo' }], [])
    ).toBe('Announcement: Week 3 Memo');
  });
  it('tags deleted announcements', () => {
    expect(resolveFiledSourceLabel({ sourceArea: 'announcements', sourceId: 'gone' }, [], [])).toBe('Source deleted');
  });
  it('labels modules via the contained item and tags removed items', () => {
    const mods = [{ title: 'Unit 1', items: [{ id: 'item-9' }] }];
    expect(resolveFiledSourceLabel({ sourceArea: 'modules', sourceId: 'item-9' }, [], mods)).toBe('Module: Unit 1');
    expect(resolveFiledSourceLabel({ sourceArea: 'modules', sourceId: 'missing' }, [], mods)).toBe('Source deleted');
  });
  it('labels syllabus and direct uploads', () => {
    expect(resolveFiledSourceLabel({ sourceArea: 'syllabus', sourceId: 'c1' }, [], [])).toBe('Syllabus');
    expect(resolveFiledSourceLabel({}, [], [])).toBe('Direct Upload');
  });
});

describe('isFolderEmptyRecursive', () => {
  const folders = [
    { id: 'area', parentId: null },
    { id: 'sub-empty', parentId: 'area' },
    { id: 'sub-full', parentId: 'area' },
  ];
  it('reports empty leaves and empty parents of empty children', () => {
    expect(isFolderEmptyRecursive(folders, [], 'sub-empty')).toBe(true);
    expect(isFolderEmptyRecursive(folders, [], 'area')).toBe(true);
  });
  it('reports parents of non-empty children as non-empty', () => {
    expect(isFolderEmptyRecursive(folders, [{ folderId: 'sub-full' }], 'area')).toBe(false);
    expect(isFolderEmptyRecursive(folders, [{ folderId: 'area' }], 'area')).toBe(false);
  });
});
