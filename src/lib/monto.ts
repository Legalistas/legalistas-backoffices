/**
 * Monto escrito a mano → número. Acepta "11804857", "11.804.857",
 * "11.804.857,50" y "11804857.50": con coma o varios puntos, los puntos son
 * de miles; un solo punto seguido de 3 dígitos también.
 */
export function parseMonto(texto: string): number | null {
	const t = texto.trim();
	if (!t) return null;
	let normal: string;
	if (t.includes(",")) normal = t.replace(/\./g, "").replace(",", ".");
	else if ((t.match(/\./g) ?? []).length > 1 || /^\d+\.\d{3}$/.test(t)) normal = t.replace(/\./g, "");
	else normal = t;
	const n = Number(normal);
	return Number.isFinite(n) ? n : null;
}
