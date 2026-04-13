export type SortDirection = 'asc' | 'desc';

export function encodeCursor(value: unknown, id: string): string {
  return Buffer.from(JSON.stringify({ value, id })).toString('base64');
}

export function decodeCursor(cursor: string): { value: unknown; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    if (!parsed || typeof parsed !== 'object') return null;
    return { value: (parsed as { value: unknown }).value, id: (parsed as { id: string }).id };
  } catch {
    return null;
  }
}

export function buildCursorFilter(
  sortField: string,
  sortDir: SortDirection,
  cursor: { value: unknown; id: string }
): Record<string, unknown> {
  const operator = sortDir === 'asc' ? '$gt' : '$lt';
  if (sortField === '_id') {
    return { _id: { [operator]: cursor.id } };
  }
  return {
    $or: [
      { [sortField]: { [operator]: cursor.value } },
      { [sortField]: cursor.value, _id: { [operator]: cursor.id } },
    ],
  };
}
