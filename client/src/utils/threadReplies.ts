// client/src/utils/threadReplies.ts
interface ThreadRow {
  id: string;
  parentId?: string | null;
  authorId: string;
}

export function resolveRootId(row: ThreadRow, byId: Map<string, ThreadRow>): string {
  const seen = new Set<string>([row.id]);
  let current = row;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) return current.id === row.id && !byId.has(current.parentId) && current.parentId !== undefined ? row.id : current.id;
    if (seen.has(parent.id)) return current.id;
    seen.add(parent.id);
    if (!parent.parentId) return parent.id;
    current = parent;
  }
  return current.id;
}

export function groupRepliesByRoot<T extends ThreadRow & { createdAt?: string }>(rows: T[]): Map<string, T[]> {
  const byId = new Map<string, T>(rows.map(r => [r.id, r]));
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const rootId = resolveRootId(row, byId);
    if (rootId === row.id) continue;
    const list = groups.get(rootId) ?? [];
    list.push(row);
    groups.set(rootId, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
  }
  return groups;
}

export function resolveSecondLayerRecipients(args: {
  actorId: string;
  parent: ThreadRow;
  root: ThreadRow;
}): string[] {
  const out: string[] = [];
  for (const candidate of [args.parent.authorId, args.root.authorId]) {
    if (!candidate || candidate === args.actorId) continue;
    if (!out.includes(candidate)) out.push(candidate);
  }
  return out;
}
