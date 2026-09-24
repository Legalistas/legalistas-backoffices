import { slugify } from "./slugify";

export interface TocItem {
	id: string;
	text: string;
	level: 2 | 3;
	children: TocItem[];
}

/**
 * Extrae los encabezados H2 y H3 del HTML para construir una tabla de
 * contenidos. Devuelve también el HTML modificado con `id` agregado a cada
 * heading que no lo tuviera, para que los links anchor funcionen.
 *
 * Solo procesa H2 y H3 (los H4+ son detalle, no van al TOC).
 */
export function extractToc(html: string): {
	toc: TocItem[];
	html: string;
} {
	if (!html) return { toc: [], html: "" };

	const flat: TocItem[] = [];
	const seenIds = new Set<string>();

	const ensureUniqueId = (base: string): string => {
		let id = base || "section";
		let i = 1;
		while (seenIds.has(id)) {
			id = `${base}-${i++}`;
		}
		seenIds.add(id);
		return id;
	};

	const stripTags = (s: string): string =>
		s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

	const transformed = html.replace(
		/<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
		(_full, tagName: string, attrs: string | undefined, inner: string) => {
			const level = tagName.toLowerCase() === "h2" ? 2 : 3;
			const text = stripTags(inner);
			if (!text) return _full;

			const existingIdMatch = attrs?.match(/\bid\s*=\s*["']([^"']+)["']/i);
			const id = existingIdMatch
				? ensureUniqueId(existingIdMatch[1])
				: ensureUniqueId(slugify(text, 60));

			flat.push({ id, text, level: level as 2 | 3, children: [] });

			let newAttrs = attrs ?? "";
			if (existingIdMatch) {
				newAttrs = newAttrs.replace(/\bid\s*=\s*["'][^"']+["']/i, `id="${id}"`);
			} else {
				newAttrs = `${newAttrs} id="${id}"`;
			}
			return `<${tagName}${newAttrs}>${inner}</${tagName}>`;
		},
	);

	// Anidar H3 bajo el H2 anterior.
	const tree: TocItem[] = [];
	let currentH2: TocItem | null = null;
	for (const item of flat) {
		if (item.level === 2) {
			currentH2 = { ...item, children: [] };
			tree.push(currentH2);
		} else if (currentH2) {
			currentH2.children.push(item);
		} else {
			// H3 huérfano (sin H2 previo) — lo tratamos como top-level.
			tree.push(item);
		}
	}

	return { toc: tree, html: transformed };
}
