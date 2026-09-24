/**
 * Convierte un título en un slug URL-safe.
 *  - Lowercase
 *  - Saca tildes y caracteres no ASCII
 *  - Reemplaza no-alfanumérico por guión
 *  - Saca guiones repetidos y los de los extremos
 *  - Trunca a `maxLen` (default 80) sin cortar palabras
 */
export function slugify(input: string, maxLen = 80): string {
	if (!input) return "";
	const normalized = input
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "") // remueve tildes
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (normalized.length <= maxLen) return normalized;
	const cut = normalized.slice(0, maxLen);
	const lastDash = cut.lastIndexOf("-");
	return lastDash > 40 ? cut.slice(0, lastDash) : cut;
}

const VALID_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
	return VALID_SLUG_RE.test(slug);
}
