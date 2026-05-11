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

export const PUBLIC_BASE_URL = process.env.S3_ENDPOINT ?? "";

export function publicUrlFor(key: string): string {
	return `${PUBLIC_BASE_URL}/${BUCKET}/${key}`;
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
