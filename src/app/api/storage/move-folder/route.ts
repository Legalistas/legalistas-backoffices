import {
	CopyObjectCommand,
	DeleteObjectsCommand,
	ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { BUCKET, normalizePrefix, s3 } from "@/lib/minio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mueve recursivamente todos los objetos de `fromPrefix` a `toPrefix`.
 * Implementado como copy + delete porque S3/MinIO no tiene "move" nativo.
 *
 * Body: { fromPrefix: string, toPrefix: string }
 */
export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { fromPrefix: rawFrom, toPrefix: rawTo } = await req.json();
	const fromPrefix = normalizePrefix(rawFrom);
	const toPrefix = normalizePrefix(rawTo);

	if (!fromPrefix || !toPrefix) {
		return NextResponse.json(
			{ error: "fromPrefix y toPrefix son requeridos" },
			{ status: 400 },
		);
	}

	if (fromPrefix === toPrefix) {
		return NextResponse.json({ moved: 0, message: "Mismo prefix, no se mueve nada" });
	}

	try {
		let moved = 0;
		const keysToDelete: string[] = [];
		let continuationToken: string | undefined;

		do {
			const list = await s3.send(
				new ListObjectsV2Command({
					Bucket: BUCKET,
					Prefix: fromPrefix,
					ContinuationToken: continuationToken,
				}),
			);

			const objects = list.Contents ?? [];

			// Copiar cada objeto al nuevo prefix (preservando paths relativos)
			await Promise.all(
				objects.map(async (obj) => {
					if (!obj.Key) return;
					const relative = obj.Key.slice(fromPrefix.length);
					const newKey = `${toPrefix}${relative}`;
					await s3.send(
						new CopyObjectCommand({
							Bucket: BUCKET,
							CopySource: `${BUCKET}/${encodeURIComponent(obj.Key).replace(/%2F/g, "/")}`,
							Key: newKey,
						}),
					);
					keysToDelete.push(obj.Key);
					moved++;
				}),
			);

			continuationToken = list.IsTruncated
				? list.NextContinuationToken
				: undefined;
		} while (continuationToken);

		// Si la carpeta destino no tenía marcador "/", asegurar que exista uno
		// (el copy ya creó las keys reales, pero si el origen estaba vacío
		// salvo por el marcador, podría no haber nada).
		if (moved === 0) {
			return NextResponse.json({
				moved: 0,
				message: "No se encontraron objetos para mover",
			});
		}

		// Borrar los originales en lotes de 1000 (límite de S3)
		for (let i = 0; i < keysToDelete.length; i += 1000) {
			const batch = keysToDelete.slice(i, i + 1000);
			await s3.send(
				new DeleteObjectsCommand({
					Bucket: BUCKET,
					Delete: { Objects: batch.map((Key) => ({ Key })) },
				}),
			);
		}

		return NextResponse.json({ moved, fromPrefix, toPrefix });
	} catch (err) {
		console.error("[/api/storage/move-folder] error:", err);
		return NextResponse.json(
			{ error: "No se pudo mover la carpeta" },
			{ status: 500 },
		);
	}
}
