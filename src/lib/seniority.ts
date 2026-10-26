/** "2 años y 3 meses" from the hire date (stored as a UTC date). null if there is none. */
export const seniority = (hireDate: string | null, now = new Date()): string | null => {
	if (!hireDate) return null;
	const start = new Date(hireDate);
	if (Number.isNaN(start.getTime())) return null;
	let months =
		(now.getFullYear() - start.getUTCFullYear()) * 12 + (now.getMonth() - start.getUTCMonth());
	if (now.getDate() < start.getUTCDate()) months -= 1;
	if (months < 1) return "Menos de un mes";
	const years = Math.floor(months / 12);
	const rest = months % 12;
	const y = years === 1 ? "1 año" : `${years} años`;
	const m = rest === 1 ? "1 mes" : `${rest} meses`;
	if (!years) return m;
	return rest ? `${y} y ${m}` : y;
};
