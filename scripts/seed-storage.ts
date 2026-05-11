/**
 * Crea las carpetas raíz del bucket `legalistas` (secciones `crm/` y `casos/`
 * con sus etapas) según la convención definida en
 * `src/constant/storage-structure.ts`.
 *
 * Idempotente: si la carpeta ya existe, `PutObject` simplemente la reescribe
 * vacía.
 *
 * Uso: `bun run scripts/seed-storage.ts`
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ALL_STAGE_PREFIXES } from "../src/constant/storage-structure";

const BUCKET = process.env.S3_BUCKET ?? "";

const s3 = new S3Client({
	region: "us-east-1",
	endpoint: process.env.S3_ENDPOINT,
	forcePathStyle: true,
	credentials: {
		accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
		secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
	},
});

async function seed() {
	if (!BUCKET) throw new Error("Falta S3_BUCKET en .env");

	console.log(`Sembrando ${ALL_STAGE_PREFIXES.length} carpetas en "${BUCKET}"...`);

	for (const prefix of ALL_STAGE_PREFIXES) {
		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: prefix,
				Body: Buffer.alloc(0),
				ContentLength: 0,
			}),
		);
		console.log(`  ✓ ${prefix}`);
	}

	console.log("\nListo.");
}

seed().catch((err) => {
	console.error("ERROR:", err);
	process.exit(1);
});
