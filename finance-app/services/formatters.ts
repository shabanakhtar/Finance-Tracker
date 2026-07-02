export function formatCategoryLabel(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return 'Uncategorized';

  return cleaned
    .split(/([\s_-]+)/)
    .map((part) => {
      if (/^[\s_-]+$/.test(part)) return part.replace(/[-_]/g, ' ');
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}
