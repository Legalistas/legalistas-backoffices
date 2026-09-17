// Mensaje de error de una respuesta del backend, listo para `toast.error`.
// Validación Zod responde `{ message }` (ya en español, con el campo que
// falló); AppError y los controllers viejos responden `{ error }`.
export async function apiErrorMessage(
	res: Response,
	fallback: string,
): Promise<string> {
	const data = await res.json().catch(() => null);
	return data?.message || data?.error || fallback;
}
