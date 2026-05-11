import {
	DeleteObjectsCommand,
	ListObjectsV2Command,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { BUCKET, joinPath, normalizePrefix, s3 } from "@/lib/minio";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { prefix, name } = await req.json();
	const cleanName = String(name ?? "").trim();
	if (!cleanName || /[\\/]/.test(cleanName)) {
		return NextResponse.json(
			{ error: "Nombre de carpeta inválido" },
			{ status: 400 },
		);
	}

	const fullKey = `${joinPath(normalizePrefix(prefix), cleanName)}/`;

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: fullKey,
				Body: Buffer.alloc(0),
				ContentLength: 0,
			}),
		);
		return NextResponse.json({ key: fullKey });
	} catch (err) {
		console.error("[/api/storage/folder POST] error:", err);
		return NextResponse.json(
			{ error: "No se pudo crear la carpeta" },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const prefix = normalizePrefix(req.nextUrl.searchParams.get("prefix"));
	if (!prefix) {
		return NextResponse.json(
			{ error: "Falta el prefix de la carpeta" },
			{ status: 400 },
		);
	}

	try {
		let deleted = 0;
		let continuationToken: string | undefined;
		do {
			const list = await s3.send(
				new ListObjectsV2Command({
					Bucket: BUCKET,
					Prefix: prefix,
					ContinuationToken: continuationToken,
				}),
			);
			const keys = (list.Contents ?? [])
				.map((o) => o.Key)
				.filter((k): k is string => Boolean(k));
			if (keys.length > 0) {
				await s3.send(
					new DeleteObjectsCommand({
						Bucket: BUCKET,
						Delete: { Objects: keys.map((Key) => ({ Key })) },
					}),
				);
				deleted += keys.length;
			}
			continuationToken = list.IsTruncated
				? list.NextContinuationToken
				: undefined;
		} while (continuationToken);

		return NextResponse.json({ deleted });
	} catch (err) {
		console.error("[/api/storage/folder DELETE] error:", err);
		return NextResponse.json(
			{ error: "No se pudo eliminar la carpeta" },
			{ status: 500 },
		);
	}
}
