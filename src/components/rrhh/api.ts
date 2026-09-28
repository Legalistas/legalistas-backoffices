import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
	RRHH_DOCUMENTO_BY_ID_ENDPOINT,
	RRHH_DOCUMENTOS_BY_USER_ENDPOINT,
} from "@/constant/api-endpoints";
import { RRHH_ADMIN_ROLES, type TipoDocumento } from "@/constant/rrhh";

export interface RrhhDocumento {
	id: number;
	userId: number;
	tipo: TipoDocumento;
	titulo: string;
	periodo: string | null;
	nombreArchivo: string;
	tamanio: number;
	mimeType: string | null;
	contratoId: number | null;
	reciboId: number | null;
	licenciaId: number | null;
	createdAt: string;
	subidoPor: { id: number; name: string };
}

async function leerError(res: Response, fallback: string) {
	const body = await res.json().catch(() => ({}));
	return body.error || body.message || fallback;
}

/** true si el rol de la sesión administra RR.HH. */
export function useEsRrhhAdmin(): boolean {
	const { data: session } = useSession();
	const rol = session?.user?.role?.toLowerCase?.() ?? "";
	return RRHH_ADMIN_ROLES.includes(rol);
}

/** Documentos del legajo de una persona (sin los borrados). */
export function useDocumentos(userId: number) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [documentos, setDocumentos] = useState<RrhhDocumento[]>([]);
	const [cargando, setCargando] = useState(false);

	const recargar = useCallback(async () => {
		if (!token || !userId) return;
		setCargando(true);
		try {
			const res = await fetch(RRHH_DOCUMENTOS_BY_USER_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			const json = await res.json();
			setDocumentos(json.data ?? []);
		} catch {
			setDocumentos([]);
		} finally {
			setCargando(false);
		}
	}, [token, userId]);

	useEffect(() => {
		recargar();
	}, [recargar]);

	return { documentos, cargando, recargar };
}

export interface SubirDocumentoCampos {
	tipo: TipoDocumento;
	titulo?: string;
	periodo?: string;
	contratoId?: number;
	reciboId?: number;
	licenciaId?: number;
}

export async function subirDocumento(
	token: string | undefined,
	userId: number,
	file: File,
	campos: SubirDocumentoCampos,
): Promise<RrhhDocumento> {
	const fd = new FormData();
	fd.append("file", file);
	for (const [k, v] of Object.entries(campos)) {
		if (v !== undefined && v !== null && v !== "") fd.append(k, String(v));
	}
	const res = await fetch(RRHH_DOCUMENTOS_BY_USER_ENDPOINT(userId), {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: fd,
	});
	if (!res.ok) throw new Error(await leerError(res, "No se pudo subir el archivo"));
	return (await res.json()).data;
}

/** Abre el documento en otra pestaña (URL firmado por 1 h). */
export async function abrirDocumento(token: string | undefined, id: number) {
	// La pestaña se abre antes del await para que el navegador no la bloquee.
	const ventana = window.open("", "_blank");
	try {
		const res = await fetch(`${RRHH_DOCUMENTO_BY_ID_ENDPOINT(id)}/url`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) throw new Error(await leerError(res, "No se pudo abrir el documento"));
		const { data } = await res.json();
		if (ventana) ventana.location.href = data.url;
		else window.location.href = data.url;
	} catch (err) {
		ventana?.close();
		throw err;
	}
}

export async function eliminarDocumento(token: string | undefined, id: number) {
	const res = await fetch(RRHH_DOCUMENTO_BY_ID_ENDPOINT(id), {
		method: "DELETE",
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok) throw new Error(await leerError(res, "No se pudo eliminar"));
}

export const formatTamanio = (bytes: number) =>
	bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const formatPeriodo = (periodo: string) => {
	const [y, m] = periodo.split("-").map(Number);
	if (!y || !m) return periodo;
	const txt = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-AR", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
	return txt.charAt(0).toUpperCase() + txt.slice(1);
};
