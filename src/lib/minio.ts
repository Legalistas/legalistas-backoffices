import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cliente S3 apuntando al MinIO de Legalistas.
 * Endpoint y credenciales se leen de .env (S3_ENDPOINT, S3_BUCKET,
 * MINIO_ACCESS_KEY, MINIO_SECRET_KEY).
 */
export const s3 = new S3Client({
	region: "us-east-1",
	endpoint: process.env.S3_ENDPOINT,
	forcePathStyle: true,
	credentials: {
		accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
		secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
	},
});

export const BUCKET = process.env.S3_BUCKET ?? "";

/**
 * Base URL pública para servir los objetos del bucket.
 * - Si está seteado `S3_PUBLIC_BASE_URL` (ej: CDN `https://static.legalistas.com.ar`)
 *   se usa esa URL sin prefijo de bucket — la CDN absorbe el bucket internamente.
 * - Sino se cae al endpoint del MinIO directo, con `/${BUCKET}/` como prefijo
 *   (formato path-style estándar de S3).
 */
const PUBLIC_BASE_URL_CDN = (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
const PUBLIC_BASE_URL_FALLBACK = (process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");

export const PUBLIC_BASE_URL = PUBLIC_BASE_URL_CDN || PUBLIC_BASE_URL_FALLBACK;

export function publicUrlFor(key: string): string {
	const cleanKey = key.replace(/^\/+/, "");
	if (PUBLIC_BASE_URL_CDN) {
		return `${PUBLIC_BASE_URL_CDN}/${cleanKey}`;
	}
	return `${PUBLIC_BASE_URL_FALLBACK}/${BUCKET}/${cleanKey}`;
}

/** Normaliza un prefix removiendo `/` al inicio y garantizando uno al final (si no es vacío). */
export function normalizePrefix(raw: string | null | undefined): string {
	if (!raw) return "";
	const trimmed = raw.replace(/^\/+/, "").replace(/\/+$/, "");
	return trimmed ? `${trimmed}/` : "";
}

/** Une segmentos de path estilo S3 (sin doble slash). */
export function joinPath(...parts: string[]): string {
	return parts
		.map((p) => p.replace(/^\/+|\/+$/g, ""))
		.filter(Boolean)
		.join("/");
}
