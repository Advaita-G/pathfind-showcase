export function toggleBookmark(bookmarkedIds: string[], id: string): string[] {
  return bookmarkedIds.includes(id)
    ? bookmarkedIds.filter((bookmarkedId) => bookmarkedId !== id)
    : [...bookmarkedIds, id];
}
