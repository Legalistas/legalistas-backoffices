import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { BUCKET, joinPath, normalizePrefix, s3 } from "@/lib/minio";

export const dynamic = "force-dynamic";
// Permitir archivos grandes — Next.js corta a ~4MB por defecto en body parser de App Router.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const formData = await req.formData();
		const prefix = normalizePrefix(String(formData.get("prefix") ?? ""));
		const uploads = formData.getAll("files");

		if (uploads.length === 0) {
			return NextResponse.json(
				{ error: "No se envió ningún archivo" },
				{ status: 400 },
			);
		}

		const results: Array<{ key: string; size: number }> = [];
		for (const entry of uploads) {
			if (!(entry instanceof File)) continue;
			const arrayBuffer = await entry.arrayBuffer();
			const key = joinPath(prefix, entry.name);
			await s3.send(
				new PutObjectCommand({
					Bucket: BUCKET,
					Key: key,
					Body: Buffer.from(arrayBuffer),
					ContentType: entry.type || "application/octet-stream",
				}),
			);
			results.push({ key, size: entry.size });
		}

		return NextResponse.json({ uploaded: results });
	} catch (err) {
		console.error("[/api/storage/upload] error:", err);
		return NextResponse.json(
			{ error: "No se pudo subir el archivo" },
			{ status: 500 },
		);
	}
}
