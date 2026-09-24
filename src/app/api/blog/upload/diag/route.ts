import { HeadBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { BUCKET, s3 } from "@/lib/minio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mask(value: string | undefined): {
	present: boolean;
	length: number;
	preview: string;
} {
	if (!value) return { present: false, length: 0, preview: "" };
	const preview =
		value.length <= 6
			? "*".repeat(value.length)
			: `${value.slice(0, 3)}...${value.slice(-2)}`;
	return { present: true, length: value.length, preview };
}

export async function GET() {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const env = {
		S3_ENDPOINT: mask(process.env.S3_ENDPOINT),
		S3_BUCKET: mask(process.env.S3_BUCKET),
		MINIO_ACCESS_KEY: mask(process.env.MINIO_ACCESS_KEY),
		MINIO_SECRET_KEY: mask(process.env.MINIO_SECRET_KEY),
		S3_PUBLIC_BASE_URL: mask(process.env.S3_PUBLIC_BASE_URL),
	};

	let bucketReachable: boolean | null = null;
	let bucketError: string | null = null;
	let bucketListSample: string[] = [];

	if (
		env.S3_ENDPOINT.present &&
		env.S3_BUCKET.present &&
		env.MINIO_ACCESS_KEY.present &&
		env.MINIO_SECRET_KEY.present
	) {
		try {
			await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
			bucketReachable = true;
			try {
				const list = await s3.send(
					new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 3 }),
				);
				bucketListSample = (list.Contents ?? []).map((o) => o.Key ?? "");
			} catch {
				// listado es un lujo — si no hay permiso, no rompe el diagnóstico
			}
		} catch (err) {
			bucketReachable = false;
			bucketError = err instanceof Error ? err.message : String(err);
		}
	}

	return NextResponse.json({
		env,
		bucket: {
			name: BUCKET,
			reachable: bucketReachable,
			error: bucketError,
			sample: bucketListSample,
		},
		runtime: {
			nodeVersion: process.version,
			platform: process.platform,
		},
	});
}
