import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { BUCKET, normalizePrefix, s3 } from "@/lib/minio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const prefix = normalizePrefix(req.nextUrl.searchParams.get("prefix"));

	try {
		const folders: string[] = [];
		const files: Array<{
			key: string;
			name: string;
			size: number;
			lastModified: string | null;
		}> = [];

		let continuationToken: string | undefined;
		do {
			const result = await s3.send(
				new ListObjectsV2Command({
					Bucket: BUCKET,
					Prefix: prefix,
					Delimiter: "/",
					ContinuationToken: continuationToken,
				}),
			);

			for (const cp of result.CommonPrefixes ?? []) {
				if (cp.Prefix) folders.push(cp.Prefix);
			}

			for (const obj of result.Contents ?? []) {
				if (!obj.Key || obj.Key === prefix) continue;
				// Marcador de carpeta vacía (key termina en "/")
				if (obj.Key.endsWith("/")) continue;
				files.push({
					key: obj.Key,
					name: obj.Key.slice(prefix.length),
					size: obj.Size ?? 0,
					lastModified: obj.LastModified?.toISOString() ?? null,
				});
			}

			continuationToken = result.IsTruncated
				? result.NextContinuationToken
				: undefined;
		} while (continuationToken);

		folders.sort();
		files.sort((a, b) => a.name.localeCompare(b.name));

		return NextResponse.json({
			prefix,
			folders: folders.map((p) => ({
				key: p,
				name: p.slice(prefix.length).replace(/\/$/, ""),
			})),
			files,
		});
	} catch (err) {
		console.error("[/api/storage/list] error:", err);
		return NextResponse.json(
			{ error: "No se pudo listar el bucket" },
			{ status: 500 },
		);
	}
}
