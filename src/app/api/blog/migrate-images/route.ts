import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { BUCKET, joinPath, publicUrlFor, s3 } from "@/lib/minio";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // batches con imágenes pesadas pueden tardar

// =============================================================================
// POST /api/blog/migrate-images
//
// Procesa una página de posts (default 5 por batch). Para cada post:
//  1. Encuentra URLs externas (featured, og, twitter, todas las <img> del HTML).
//  2. Skipea las que ya están en MinIO.
//  3. Baja cada imagen, sube a `blog/<año>/<mes>/<filename>` y guarda mapping.
//  4. Reescribe contentHtml y actualiza el post via backend PUT /posts/:id.
//
// Cliente debe iterar llamando con page=1, 2, 3... hasta totalPages.
// =============================================================================

// Mismo env var que usa src/constant/api-endpoints.ts.
const API_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL_API ||
	process.env.NEXT_PUBLIC_API_BASE_URL ||
	"";
const S3_ENDPOINT = process.env.S3_ENDPOINT || "";
const S3_PUBLIC_BASE_URL = (process.env.S3_PUBLIC_BASE_URL || "").replace(
	/\/$/,
	"",
);
const LANDING_URL =
	process.env.NEXT_PUBLIC_LANDING_URL || "https://legalistas.ar";
const LANDING_MANIFEST_URL = `${LANDING_URL.replace(/\/$/, "")}/blog_images/_manifest.json`;

const SAFE_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"webp",
	"avif",
	"gif",
	"svg",
]);

interface PostShape {
	id: number;
	title: string;
	slug: string;
	date: string;
	contentHtml: string;
	featuredImageUrl: string | null;
	ogImage: string | null;
	twitterImage: string | null;
}

type Manifest = Record<string, string>;

async function loadLandingManifest(): Promise<Manifest> {
	try {
		const res = await fetch(LANDING_MANIFEST_URL, {
			cache: "no-store",
			headers: { "User-Agent": "Legalistas-Migrator/1.0" },
		});
		if (!res.ok) return {};
		const data = (await res.json()) as Manifest;
		return data || {};
	} catch {
		return {};
	}
}

function landingImageUrlFor(slug: string, manifest: Manifest): string | null {
	if (!slug) return null;
	const filename = manifest[slug];
	if (!filename) return null;
	return `${LANDING_URL.replace(/\/$/, "")}/blog_images/${filename}`;
}

interface PerImageResult {
	src: string;
	newUrl?: string;
	skipped?: boolean;
	error?: string;
}

interface PerPostResult {
	id: number;
	title: string;
	updated: boolean;
	images: PerImageResult[];
	sql?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
	if (!raw) return raw;
	const trimmed = raw.trim();
	if (trimmed.startsWith("//")) return `https:${trimmed}`;
	if (trimmed.startsWith("/")) return `https://legalistas.ar${trimmed}`;
	return trimmed;
}

function isAlreadyInMinio(url: string): boolean {
	if (!url) return false;
	// CDN público (ej: https://static.legalistas.com.ar/blog/...)
	if (S3_PUBLIC_BASE_URL && url.startsWith(S3_PUBLIC_BASE_URL)) return true;
	// Endpoint directo del MinIO
	if (S3_ENDPOINT && url.includes(S3_ENDPOINT)) return true;
	// Fallback: si la URL apunta a un path que contiene /<BUCKET>/blog/
	if (BUCKET && url.includes(`/${BUCKET}/blog/`)) return true;
	return false;
}

function extractImgSrcsFromHtml(html: string): string[] {
	const re = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
	const urls = new Set<string>();
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) {
		urls.add(m[1]);
	}
	return Array.from(urls);
}

function sanitizeFilename(name: string): string {
	const cleaned = name
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9.-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return cleaned || "img";
}

function deriveKey(post: PostShape, srcUrl: string): string | null {
	try {
		const u = new URL(normalizeUrl(srcUrl));
		const pathBasename = u.pathname.split("/").filter(Boolean).pop() || "img";
		const dot = pathBasename.lastIndexOf(".");
		const base = dot > 0 ? pathBasename.slice(0, dot) : pathBasename;
		const ext = (dot > 0 ? pathBasename.slice(dot + 1) : "")
			.toLowerCase()
			.split("?")[0];
		if (!SAFE_EXTENSIONS.has(ext)) return null;
		const sanitized = sanitizeFilename(base);
		const d = new Date(post.date);
		const year = String(
			isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear(),
		);
		const month = String(
			(isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth()) + 1,
		).padStart(2, "0");
		return joinPath("blog", year, month, `${post.id}-${sanitized}.${ext}`);
	} catch {
		return null;
	}
}

async function downloadAndUploadOne(
	post: PostShape,
	srcUrl: string,
): Promise<PerImageResult> {
	const normalized = normalizeUrl(srcUrl);
	if (isAlreadyInMinio(normalized)) {
		return { src: srcUrl, newUrl: normalized, skipped: true };
	}

	const key = deriveKey(post, normalized);
	if (!key) {
		return {
			src: srcUrl,
			error: "Extensión no soportada o URL inválida",
		};
	}

	try {
		const res = await fetch(normalized, {
			redirect: "follow",
			headers: {
				"User-Agent": "Legalistas-Migrator/1.0",
			},
		});
		if (!res.ok) {
			return { src: srcUrl, error: `HTTP ${res.status}` };
		}
		const contentType = res.headers.get("content-type") || "application/octet-stream";
		const arrayBuffer = await res.arrayBuffer();
		if (arrayBuffer.byteLength === 0) {
			return { src: srcUrl, error: "Imagen vacía" };
		}
		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: Buffer.from(arrayBuffer),
				ContentType: contentType,
				CacheControl: "public, max-age=31536000, immutable",
			}),
		);
		return { src: srcUrl, newUrl: publicUrlFor(key) };
	} catch (err) {
		return {
			src: srcUrl,
			error: err instanceof Error ? err.message : "download/upload error",
		};
	}
}

function rewriteHtml(html: string, mapping: Map<string, string>): string {
	if (!html || mapping.size === 0) return html;
	let result = html;
	for (const [oldUrl, newUrl] of mapping.entries()) {
		if (oldUrl === newUrl) continue;
		// Reemplaza tanto la forma literal como con / iniciales para URLs relativas
		const escapedOld = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		result = result.replace(new RegExp(escapedOld, "g"), newUrl);
	}
	return result;
}

// Escape MySQL string para usar dentro de comillas simples.
// Cubre: backslash, single quote, NUL, CR, LF, ctrl-Z. Suficiente para `posts.contentHtml`.
function mysqlEscape(s: string | null): string {
	if (s === null || s === undefined) return "NULL";
	const escaped = s
		.replace(/\\/g, "\\\\")
		.replace(/'/g, "\\'")
		.replace(/\0/g, "\\0")
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\x1a/g, "\\Z");
	return `'${escaped}'`;
}

function buildUpdateSql(
	postId: number,
	updates: {
		featuredImageUrl: string | null;
		ogImage: string | null;
		twitterImage: string | null;
		contentHtml: string;
	},
): string {
	return [
		`UPDATE \`posts\` SET`,
		`  \`featuredImageUrl\` = ${mysqlEscape(updates.featuredImageUrl)},`,
		`  \`ogImage\` = ${mysqlEscape(updates.ogImage)},`,
		`  \`twitterImage\` = ${mysqlEscape(updates.twitterImage)},`,
		`  \`contentHtml\` = ${mysqlEscape(updates.contentHtml)},`,
		`  \`modified\` = NOW()`,
		`WHERE \`id\` = ${postId};`,
	].join("\n");
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const accessToken = (session.user as any)?.accessToken;
		if (!accessToken) {
			return NextResponse.json(
				{ error: "Sin accessToken en la sesión" },
				{ status: 401 },
			);
		}

		// Validar env vars críticas antes de seguir.
		if (!API_BASE_URL) {
			return NextResponse.json(
				{
					error:
						"NEXT_PUBLIC_BACKEND_URL_API no está seteado en el .env del admin",
				},
				{ status: 500 },
			);
		}
		if (!BUCKET || !S3_ENDPOINT) {
			return NextResponse.json(
				{
					error:
						"Faltan vars MinIO: S3_ENDPOINT y/o S3_BUCKET no están seteados en el .env del admin",
				},
				{ status: 500 },
			);
		}

		const body = await req.json().catch(() => ({}));
		const page = Math.max(1, Number(body.page) || 1);
		const perPage = Math.min(20, Math.max(1, Number(body.per_page) || 5));
		const dryRun = body.dryRun === true;

		// 1) Fetch posts del backend con status=any
		let listUrl: URL;
		try {
			listUrl = new URL(`${API_BASE_URL.replace(/\/$/, "")}/posts`);
		} catch (err) {
			return NextResponse.json(
				{
					error: `NEXT_PUBLIC_API_BASE_URL inválido (${API_BASE_URL}): ${err instanceof Error ? err.message : "URL inválida"}`,
				},
				{ status: 500 },
			);
		}
		listUrl.searchParams.set("status", "any");
		listUrl.searchParams.set("page", String(page));
		listUrl.searchParams.set("per_page", String(perPage));

		const listRes = await fetch(listUrl.toString(), {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			cache: "no-store",
		});
		if (!listRes.ok) {
			const detail = await listRes.text().catch(() => "");
			return NextResponse.json(
				{
					error: `Backend devolvió ${listRes.status} en GET ${listUrl.pathname}${detail ? ` — ${detail.slice(0, 200)}` : ""}`,
				},
				{ status: 502 },
			);
		}
		const contentType = listRes.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) {
			const raw = await listRes.text().catch(() => "");
			return NextResponse.json(
				{
					error: `Backend respondió Content-Type=${contentType || "ninguno"} en lugar de JSON. Primeros chars: ${raw.slice(0, 200)}`,
				},
				{ status: 502 },
			);
		}
		const listJson = await listRes.json();
	const posts: PostShape[] = listJson.posts || [];
	const total = listJson.pagination?.total ?? posts.length;
	const totalPages = listJson.pagination?.total_pages ?? 1;

	// Manifest del landing: mapea slug → filename local (preferido sobre URL WP).
	const manifest = await loadLandingManifest();
	const usingManifest = Object.keys(manifest).length > 0;

	const processed: PerPostResult[] = [];

	for (const post of posts) {
		// Mapeo de "URL guardada en DB" → "URL fuente de descarga" (substituye WP por landing si hay match en manifest).
		const sourceFor = new Map<string, string>();

		const collected = new Set<string>();
		if (post.featuredImageUrl) {
			collected.add(post.featuredImageUrl);
			const landingUrl = landingImageUrlFor(post.slug, manifest);
			if (
				landingUrl &&
				!isAlreadyInMinio(post.featuredImageUrl) &&
				!isAlreadyInMinio(landingUrl)
			) {
				sourceFor.set(post.featuredImageUrl, landingUrl);
			}
		}
		if (post.ogImage) collected.add(post.ogImage);
		if (post.twitterImage) collected.add(post.twitterImage);
		for (const src of extractImgSrcsFromHtml(post.contentHtml || "")) {
			collected.add(src);
		}

		const perPostImages: PerImageResult[] = [];
		const mapping = new Map<string, string>();

		// Procesar secuencial. Usa el sourceFor override si existe.
		for (const urlInDb of collected) {
			const fetchFrom = sourceFor.get(urlInDb) || urlInDb;
			const r = await downloadAndUploadOne(post, fetchFrom);
			// Reportamos contra la URL original que vive en DB para que el mapping reescriba bien.
			perPostImages.push({ ...r, src: urlInDb });
			if (r.newUrl && r.newUrl !== urlInDb) {
				mapping.set(urlInDb, r.newUrl);
			}
		}

		const hasChanges = mapping.size > 0;
		let updated = false;
		let sql: string | null = null;

		if (hasChanges) {
			const newFeatured =
				post.featuredImageUrl && mapping.get(post.featuredImageUrl)
					? mapping.get(post.featuredImageUrl)!
					: post.featuredImageUrl;
			const newOg =
				post.ogImage && mapping.get(post.ogImage)
					? mapping.get(post.ogImage)!
					: post.ogImage;
			const newTwitter =
				post.twitterImage && mapping.get(post.twitterImage)
					? mapping.get(post.twitterImage)!
					: post.twitterImage;
			const newContent = rewriteHtml(post.contentHtml || "", mapping);

			// Generamos siempre el SQL, sirve como audit log incluso si aplicamos via API.
			sql = buildUpdateSql(post.id, {
				featuredImageUrl: newFeatured,
				ogImage: newOg,
				twitterImage: newTwitter,
				contentHtml: newContent,
			});

			if (!dryRun) {
				const putRes = await fetch(`${API_BASE_URL}/posts/${post.id}`, {
					method: "PUT",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						featuredImageUrl: newFeatured,
						ogImage: newOg,
						twitterImage: newTwitter,
						contentHtml: newContent,
					}),
				});
				updated = putRes.ok;
				if (!putRes.ok) {
					perPostImages.push({
						src: "[update DB]",
						error: `PUT /posts/${post.id} fallรณ con ${putRes.status}`,
					});
				}
			}
		}

		processed.push({
			id: post.id,
			title: post.title,
			updated,
			images: perPostImages,
			...(sql ? { sql } : {}),
		});
	}

		return NextResponse.json({
			page,
			per_page: perPage,
			total,
			totalPages,
			processed,
			usingManifest,
			dryRun,
		});
	} catch (err) {
		console.error("[/api/blog/migrate-images] uncaught:", err);
		return NextResponse.json(
			{
				error:
					err instanceof Error
						? `${err.name}: ${err.message}`
						: "Error inesperado en la migración",
			},
			{ status: 500 },
		);
	}
}
