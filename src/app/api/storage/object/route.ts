import {
	DeleteObjectCommand,
	GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { BUCKET, s3 } from "@/lib/minio";

export const dynamic = "force-dynamic";

/** Devuelve un presigned URL para descargar/visualizar el objeto. */
export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const key = req.nextUrl.searchParams.get("key");
	if (!key) {
		return NextResponse.json({ error: "Falta el key" }, { status: 400 });
	}

	// Si `download=1`, el presigned URL fuerza `Content-Disposition: attachment`
	// y el browser baja el archivo en vez de abrirlo en pestaña.
	const forceDownload = req.nextUrl.searchParams.get("download") === "1";
	const fileName = key.split("/").pop() || "archivo";

	try {
		const url = await getSignedUrl(
			s3,
			new GetObjectCommand({
				Bucket: BUCKET,
				Key: key,
				...(forceDownload
					? {
							ResponseContentDisposition: `attachment; filename="${encodeURIComponent(
								fileName,
							)}"`,
						}
					: {}),
			}),
			{ expiresIn: 60 * 5 },
		);
		return NextResponse.json({ url });
	} catch (err) {
		console.error("[/api/storage/object GET] error:", err);
		return NextResponse.json(
			{ error: "No se pudo generar la URL" },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const key = req.nextUrl.searchParams.get("key");
	if (!key) {
		return NextResponse.json({ error: "Falta el key" }, { status: 400 });
	}

	try {
		await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
		return NextResponse.json({ deleted: key });
	} catch (err) {
		console.error("[/api/storage/object DELETE] error:", err);
		return NextResponse.json(
			{ error: "No se pudo eliminar el archivo" },
			{ status: 500 },
		);
	}
}
