import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { BUCKET, joinPath, publicUrlFor, s3 } from "@/lib/minio";

// sharp se importa dinámicamente dentro del handler para que un fallo al cargar
// el binario nativo (Vercel serverless / linuxmusl / arch mismatch) no crashee
// toda la función. Si sharp no está disponible, se sube el original sin optimizar.
type SharpFn = (typeof import("sharp"))["default"];
let sharpPromise: Promise<SharpFn | null> | null = null;
function loadSharp(): Promise<SharpFn | null> {
	if (!sharpPromise) {
		sharpPromise = import("sharp")
			.then((m) => m.default)
			.catch((err) => {
				console.warn("[/api/blog/upload] sharp no disponible:", err);
				return null;
			});
	}
	return sharpPromise;
}

export const dynamic = "force-dynamic";
// Imágenes de blog pueden ser pesadas (banners, hero) — extender timeout.
export const maxDuration = 60;
// sharp es nativo y requiere el runtime Node, no Edge.
export const runtime = "nodejs";

const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;
// Estas extensiones pasan sin tocar (sharp no las procesa bien o no aporta).
const PASSTHROUGH_EXTENSIONS = new Set(["svg", "gif"]);

const SAFE_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"webp",
	"avif",
	"gif",
	"svg",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10MB por archivo.

function slugifyForFilename(input: string): string {
	return input
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

function randomSuffix(): string {
	return Math.random().toString(36).slice(2, 8);
}

/**
 * POST /api/blog/upload
 *
 * Sube imágenes del blog al bucket MinIO con path `blog/YYYY/MM/<slug>-<suffix>.<ext>`.
 * Devuelve la URL pública para que el editor / featured image la guarden.
 *
 * Form fields:
 *   - file (File, requerido)
 *   - slug (string, opcional — se usa para nombrar el archivo; default = nombre original)
 */
export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let step = "init";
	let fileInfo: { name?: string; type?: string; size?: number } = {};

	try {
		step = "parse-formdata";
		const formData = await req.formData();
		const file = formData.get("file");
		const slugHint = (formData.get("slug") as string | null)?.trim() || "";

		if (file instanceof File) {
			fileInfo = { name: file.name, type: file.type, size: file.size };
			console.log("[/api/blog/upload] recibido:", fileInfo, "slug:", slugHint);
		}

		if (!(file instanceof File)) {
			return NextResponse.json(
				{ error: "Falta el archivo (campo 'file')" },
				{ status: 400 },
			);
		}

		if (file.size === 0) {
			return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
		}

		if (file.size > MAX_BYTES) {
			return NextResponse.json(
				{ error: `Archivo demasiado grande (máx ${MAX_BYTES / 1024 / 1024}MB)` },
				{ status: 413 },
			);
		}

		step = "validate-ext";
		const ext = (file.name.split(".").pop() || "").toLowerCase();
		if (!SAFE_EXTENSIONS.has(ext)) {
			return NextResponse.json(
				{
					error: `Extensión no permitida: .${ext}. Permitidas: ${Array.from(SAFE_EXTENSIONS).join(", ")}`,
				},
				{ status: 415 },
			);
		}

		// Path: blog/YYYY/MM/<slug-o-nombre>-<suffix>.<ext>
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");

		const baseName =
			slugifyForFilename(slugHint) ||
			slugifyForFilename(file.name.replace(/\.[^.]+$/, ""));

		step = "read-buffer";
		const inputBuffer = Buffer.from(await file.arrayBuffer());

		// SVG/GIF pasan tal cual (sharp puede romperlos). El resto va al pipeline.
		const passthrough = PASSTHROUGH_EXTENSIONS.has(ext);
		step = passthrough ? "passthrough" : "sharp-process";

		let outputBuffer: Buffer;
		let outputExt: string;
		let outputContentType: string;
		let originalDimensions: { width?: number; height?: number } = {};

		const sharp = await loadSharp();

		if (passthrough || !sharp) {
			outputBuffer = inputBuffer;
			outputExt = ext;
			outputContentType = file.type || "application/octet-stream";
		} else {
			try {
				const pipeline = sharp(inputBuffer, { failOn: "none" }).rotate(); // honra EXIF orientation
				const meta = await pipeline.metadata();
				originalDimensions = {
					width: meta.width,
					height: meta.height,
				};
				// Resize solo si supera el ancho máximo (no estiramos).
				if (meta.width && meta.width > MAX_WIDTH) {
					pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
				}
				// withMetadata(undefined) = strip ALL metadata (EXIF, IPTC, XMP).
				// Convertimos siempre a webp para mejor compresión sin pérdida visible.
				outputBuffer = await pipeline
					.webp({ quality: WEBP_QUALITY, effort: 4 })
					.toBuffer();
				outputExt = "webp";
				outputContentType = "image/webp";
			} catch (err) {
				console.warn("[/api/blog/upload] sharp falló, pasando original:", err);
				outputBuffer = inputBuffer;
				outputExt = ext;
				outputContentType = file.type || "application/octet-stream";
			}
		}

		step = "s3-upload";
		const fileName = `${baseName || "img"}-${randomSuffix()}.${outputExt}`;
		const key = joinPath("blog", String(year), month, fileName);

		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: outputBuffer,
				ContentType: outputContentType,
				CacheControl: "public, max-age=31536000, immutable",
			}),
		);
		step = "done";

		return NextResponse.json({
			key,
			url: publicUrlFor(key),
			size: outputBuffer.length,
			originalSize: file.size,
			contentType: outputContentType,
			width: originalDimensions.width,
			height: originalDimensions.height,
			optimized: !passthrough,
		});
	} catch (err) {
		console.error(
			`[/api/blog/upload] error step=${step} file=`,
			fileInfo,
			err,
		);
		const message = err instanceof Error ? err.message : String(err);
		const errName = err instanceof Error ? err.name : "Error";
		return NextResponse.json(
			{
				error: `No se pudo subir la imagen: ${message}`,
				step,
				errName,
				fileInfo,
			},
			{ status: 500 },
		);
	}
}
