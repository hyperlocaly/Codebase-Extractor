export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
  maxAttempts = 10,
): Promise<string> {
  const baseSlug = slugify(base);

  if (!(await exists(baseSlug))) {
    return baseSlug;
  }

  for (let i = 2; i <= maxAttempts; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${baseSlug}-${suffix}`;
}
