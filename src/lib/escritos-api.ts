// Llamadas JSON al backend de Escritos con el token de la sesión. Tira Error
// con el mensaje del backend (`{ error }`) para mostrarlo en un toast.

export async function escritosFetch<T>(
	url: string,
	token: string,
	init: RequestInit = {},
): Promise<T> {
	const res = await fetch(url, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			...(init.body ? { "Content-Type": "application/json" } : {}),
			...init.headers,
		},
	});
	if (!res.ok) {
		const j = await res.json().catch(() => ({}));
		throw new Error(j.error || j.message || `HTTP ${res.status}`);
	}
	return res.json() as Promise<T>;
}

/** Abre en otra pestaña un PDF que el backend devuelve como archivo. */
export async function abrirPdf(url: string, token: string): Promise<void> {
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
	if (!res.ok) {
		const j = await res.json().catch(() => ({}));
		throw new Error(j.error || `HTTP ${res.status}`);
	}
	const blob = await res.blob();
	window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
}
