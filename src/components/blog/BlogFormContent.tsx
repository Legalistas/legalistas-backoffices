"use client";

import { ArrowLeft, Eye, Link2, Loader2, MessageCircleQuestion, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAutosave } from "@/hooks/useAutosave";
import { cn } from "@/lib/utils";
import {
	POSTS_AI_GENERATE_META_ENDPOINT,
	POSTS_AI_GENERATE_TITLES_ENDPOINT,
	POSTS_CATEGORIES_ENDPOINT,
	POSTS_ENDPOINT,
	POSTS_TAGS_ENDPOINT,
	POST_BY_ID_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	Post,
	PostSchemaType,
	PostStatus,
	PostTerm,
} from "@/types/blog";
import { AiFaqGeneratorDialog } from "./AiFaqGeneratorDialog";
import { AiInternalLinksDialog } from "./AiInternalLinksDialog";
import { AiSuggestionPopover } from "./AiSuggestionPopover";
import { AuthorSelector } from "./AuthorSelector";
import { AutosaveIndicator } from "./AutosaveIndicator";
import { BlogEditor } from "./BlogEditor";
import { BlogPostPreview } from "./BlogPostPreview";
import { CategoryTagInput } from "./CategoryTagInput";
import { FeaturedImageUploader } from "./FeaturedImageUploader";
import { GoogleSnippetPreview } from "./GoogleSnippetPreview";
import { OgTwitterPreview } from "./OgTwitterPreview";
import { PublishingSidebar } from "./PublishingSidebar";
import { SeoScorePanel } from "./SeoScorePanel";
import { SlugInput } from "./SlugInput";

interface BlogFormContentProps {
	initialPost?: Post;
}

const parseTerms = (
	raw: Post["categories"] | Post["tags"] | undefined,
): PostTerm[] => {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const toDatetimeLocal = (iso: string | null): string => {
	if (!iso) return "";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function BlogFormContent({ initialPost }: BlogFormContentProps) {
	const router = useRouter();
	const { data: session } = useSession();
	const isEdit = !!initialPost;

	// Datos principales
	const [title, setTitle] = useState(initialPost?.title ?? "");
	const [slug, setSlug] = useState(initialPost?.slug ?? "");
	const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? "");
	const [contentHtml, setContentHtml] = useState(initialPost?.contentHtml ?? "");

	// Imagen destacada
	const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(
		initialPost?.featuredImageUrl ?? null,
	);
	const [featuredImageAlt, setFeaturedImageAlt] = useState(
		initialPost?.featuredImageAlt ?? "",
	);
	const [featuredImageWidth, setFeaturedImageWidth] = useState<number | null>(
		initialPost?.featuredImageWidth ?? null,
	);
	const [featuredImageHeight, setFeaturedImageHeight] = useState<number | null>(
		initialPost?.featuredImageHeight ?? null,
	);

	// Taxonomía
	const [categories, setCategories] = useState<PostTerm[]>(
		parseTerms(initialPost?.categories),
	);
	const [tags, setTags] = useState<PostTerm[]>(parseTerms(initialPost?.tags));
	const [categoriesSuggestions, setCategoriesSuggestions] = useState<
		PostTerm[]
	>([]);
	const [tagsSuggestions, setTagsSuggestions] = useState<PostTerm[]>([]);

	// SEO editable
	const [seoTitle, setSeoTitle] = useState(initialPost?.seoTitle ?? "");
	const [metaDescription, setMetaDescription] = useState(
		initialPost?.metaDescription ?? "",
	);
	const [seoKeywords, setSeoKeywords] = useState(
		initialPost?.seoKeywords ?? "",
	);
	const [ogTitle, setOgTitle] = useState(initialPost?.ogTitle ?? "");
	const [ogDescription, setOgDescription] = useState(
		initialPost?.ogDescription ?? "",
	);
	const [ogImage, setOgImage] = useState<string | null>(
		initialPost?.ogImage ?? null,
	);
	const [twitterTitle, setTwitterTitle] = useState(
		initialPost?.twitterTitle ?? "",
	);
	const [twitterDescription, setTwitterDescription] = useState(
		initialPost?.twitterDescription ?? "",
	);
	const [twitterImage, setTwitterImage] = useState<string | null>(
		initialPost?.twitterImage ?? null,
	);

	// Autor (E-E-A-T). authorName se preserva para retrocompat con los 95 WP.
	const [authorId, setAuthorId] = useState<number | null>(
		initialPost?.authorId && initialPost.authorId > 0
			? initialPost.authorId
			: null,
	);
	const [authorName, setAuthorName] = useState<string>(
		initialPost?.authorName ?? "",
	);

	// SEO avanzado
	const [status, setStatus] = useState<PostStatus>(
		initialPost?.status ?? "draft",
	);
	const [publishedAt, setPublishedAt] = useState(
		toDatetimeLocal(initialPost?.publishedAt ?? null),
	);
	const [focusKeyword, setFocusKeyword] = useState(
		initialPost?.focusKeyword ?? "",
	);
	const [canonical, setCanonical] = useState(initialPost?.canonical ?? "");
	const [noindex, setNoindex] = useState(initialPost?.noindex ?? false);
	const [nofollow, setNofollow] = useState(initialPost?.nofollow ?? false);
	const [schemaType, setSchemaType] = useState<PostSchemaType>(
		initialPost?.schemaType ?? "BlogPosting",
	);

	// Submit
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Autosave state — el id puede mutar después del primer autosave (NEW → existente).
	const [currentPostId, setCurrentPostId] = useState<number | null>(
		initialPost?.id ?? null,
	);

	// Preview drawer
	const [previewOpen, setPreviewOpen] = useState(false);
	// AI dialogs
	const [faqDialogOpen, setFaqDialogOpen] = useState(false);
	const [linksDialogOpen, setLinksDialogOpen] = useState(false);

	// Cargar sugerencias de categorías y tags
	useEffect(() => {
		if (!session?.user?.accessToken) return;
		const headers = {
			Authorization: `Bearer ${session.user.accessToken}`,
		};
		fetch(POSTS_CATEGORIES_ENDPOINT, { headers })
			.then((r) => (r.ok ? r.json() : []))
			.then((data: PostTerm[]) => setCategoriesSuggestions(data))
			.catch(() => {});
		fetch(POSTS_TAGS_ENDPOINT, { headers })
			.then((r) => (r.ok ? r.json() : []))
			.then((data: PostTerm[]) => setTagsSuggestions(data))
			.catch(() => {});
	}, [session?.user?.accessToken]);

	// Payload completo del post — usado tanto por submit manual como por autosave.
	const payload = useMemo(
		() => ({
			title,
			slug,
			excerpt,
			contentHtml,
			status,
			featuredImageUrl,
			featuredImageAlt,
			featuredImageWidth,
			featuredImageHeight,
			categories,
			tags,
			authorId,
			authorName: authorName || session?.user?.name || "Admin",
			seoTitle: seoTitle || null,
			metaDescription: metaDescription || null,
			seoKeywords: seoKeywords || null,
			ogTitle: ogTitle || null,
			ogDescription: ogDescription || null,
			ogImage: ogImage || null,
			twitterTitle: twitterTitle || null,
			twitterDescription: twitterDescription || null,
			twitterImage: twitterImage || null,
			publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
			focusKeyword: focusKeyword || null,
			canonical: canonical || null,
			noindex,
			nofollow,
			schemaType,
		}),
		[
			title,
			slug,
			excerpt,
			contentHtml,
			status,
			featuredImageUrl,
			featuredImageAlt,
			featuredImageWidth,
			featuredImageHeight,
			categories,
			tags,
			authorId,
			authorName,
			session?.user?.name,
			seoTitle,
			metaDescription,
			seoKeywords,
			ogTitle,
			ogDescription,
			ogImage,
			twitterTitle,
			twitterDescription,
			twitterImage,
			publishedAt,
			focusKeyword,
			canonical,
			noindex,
			nofollow,
			schemaType,
		],
	);

	// Autosave habilitado solo si: hay session + título no vacío + slug válido + contenido no vacío.
	// Para posts nuevos guarda como draft. Para editados respeta el status actual.
	// El contenido se considera vacío si al stripear tags/nbsp no queda texto (TinyMCE puede
	// emitir "", "<p></p>", "<p>&nbsp;</p>", "<p><br></p>", etc.).
	const hasContent = useMemo(() => {
		const stripped = contentHtml
			.replace(/<[^>]*>/g, "")
			.replace(/&nbsp;/g, "")
			.replace(/\s+/g, "")
			.trim();
		return stripped.length > 0;
	}, [contentHtml]);

	const autosaveEnabled =
		!!session?.user?.accessToken &&
		title.trim().length > 0 &&
		slug.trim().length > 0 &&
		hasContent;

	const autosavePayload = useMemo(
		() => ({
			...payload,
			// Si el post es nuevo, persistirlo siempre como draft.
			status: currentPostId == null ? "draft" : payload.status,
		}),
		[payload, currentPostId],
	);

	const autosaveSave = useCallback(
		async (value: typeof autosavePayload) => {
			if (!session?.user?.accessToken) return;
			const headers = {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session.user.accessToken}`,
			};
			if (currentPostId == null) {
				const res = await fetch(POSTS_ENDPOINT, {
					method: "POST",
					headers,
					body: JSON.stringify(value),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({ error: "Error" }));
					throw new Error(err.error || `Error ${res.status}`);
				}
				const data = await res.json();
				setCurrentPostId(data.id);
				// Reemplazar URL en el browser para que reloads no pierdan el draft.
				if (typeof window !== "undefined") {
					router.replace(`/admin/blog/${data.id}/edit`);
				}
				return;
			}
			const res = await fetch(POST_BY_ID_ENDPOINT(currentPostId), {
				method: "PUT",
				headers,
				body: JSON.stringify(value),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: "Error" }));
				throw new Error(err.error || `Error ${res.status}`);
			}
		},
		[session?.user?.accessToken, currentPostId, router],
	);

	const { state: autosaveState } = useAutosave({
		value: autosavePayload,
		save: autosaveSave,
		enabled: autosaveEnabled,
	});

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!session?.user?.accessToken) return;

			if (!title.trim()) {
				toast.error("El título es obligatorio");
				return;
			}
			if (!slug.trim()) {
				toast.error("El slug es obligatorio");
				return;
			}
			if (!contentHtml.trim() || contentHtml === "<p></p>") {
				toast.error("El contenido no puede estar vacío");
				return;
			}

			setIsSubmitting(true);
			setError(null);

			try {
				const existingId = currentPostId;
				const url = existingId
					? POST_BY_ID_ENDPOINT(existingId)
					: POSTS_ENDPOINT;
				const res = await fetch(url, {
					method: existingId ? "PUT" : "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
					body: JSON.stringify(payload),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({ error: "Error" }));
					throw new Error(err.error || "Error al guardar");
				}
				toast.success(existingId ? "Post actualizado" : "Post creado");
				router.push("/admin/blog");
			} catch (err) {
				console.error("[BlogForm] submit:", err);
				const msg =
					err instanceof Error ? err.message : "Error al guardar el post";
				setError(msg);
				toast.error(msg);
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			session,
			title,
			slug,
			contentHtml,
			payload,
			currentPostId,
			router,
		],
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Link
						href="/admin/blog"
						className="p-2 rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/5"
						title="Volver al listado"
					>
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
							{isEdit ? "Editar post" : "Nuevo post"}
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{isEdit
								? `Modificando "${initialPost?.title}"`
								: "Crear un nuevo post del blog público"}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<AutosaveIndicator state={autosaveState} enabled={autosaveEnabled} />
					<Button
						type="button"
						variant="outline"
						onClick={() => setPreviewOpen(true)}
						disabled={!title.trim() && !contentHtml.trim()}
						className="flex items-center gap-2"
						title="Ver cómo se renderiza en la landing"
					>
						<Eye className="h-4 w-4" />
						Vista previa
					</Button>
					<Link href="/admin/blog">
						<Button type="button" variant="outline" disabled={isSubmitting}>
							Cancelar
						</Button>
					</Link>
					<Button
						type="submit"
						disabled={isSubmitting}
						className="bg-primary hover:bg-primary/85 text-white min-w-32"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Guardando...
							</>
						) : (
							<>
								<Save className="w-4 h-4 mr-2" />
								{isEdit || currentPostId ? "Guardar" : "Crear post"}
							</>
						)}
					</Button>
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
					{error}
				</div>
			)}

			{/* Layout 2 columnas */}
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
				{/* Columna principal */}
				<div className="space-y-4">
					{/* Título */}
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
							Título
						</label>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Título del post"
							className="h-12 text-lg font-semibold"
							required
						/>
					</div>

					{/* Slug */}
					<SlugInput
						title={title}
						value={slug}
						onChange={setSlug}
						excludeId={initialPost?.id}
					/>

					{/* Excerpt */}
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
							Extracto
						</label>
						<textarea
							value={excerpt}
							onChange={(e) => setExcerpt(e.target.value)}
							rows={2}
							maxLength={300}
							placeholder="Resumen corto del post (aparece en la lista de la landing)"
							className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
						/>
						<p className="text-[11px] text-gray-400">
							{excerpt.length}/300 caracteres
						</p>
					</div>

					{/* Tabs Contenido / SEO */}
					<Tabs defaultValue="content" className="w-full">
						<TabsList className="grid w-full max-w-md grid-cols-2">
							<TabsTrigger value="content">Contenido</TabsTrigger>
							<TabsTrigger value="seo">SEO &amp; Social</TabsTrigger>
						</TabsList>

						<TabsContent value="content" className="mt-4 space-y-3">
							<BlogEditor
								content={contentHtml}
								onChange={setContentHtml}
								slugHint={slug}
							/>

							{/* Acciones de IA sobre el contenido */}
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={() => setLinksDialogOpen(true)}
									disabled={!title.trim() || !contentHtml.trim()}
									className={cn(
										"inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors",
										"border-purple-200 bg-purple-50 text-purple-700",
										"hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-700/40 dark:text-purple-300 dark:hover:bg-purple-900/30",
										"disabled:opacity-50 disabled:cursor-not-allowed",
									)}
								>
									<Link2 className="h-3.5 w-3.5" />
									Sugerir links internos con IA
								</button>
								<button
									type="button"
									onClick={() => setFaqDialogOpen(true)}
									disabled={!title.trim() || !contentHtml.trim()}
									className={cn(
										"inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors",
										"border-purple-200 bg-purple-50 text-purple-700",
										"hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-700/40 dark:text-purple-300 dark:hover:bg-purple-900/30",
										"disabled:opacity-50 disabled:cursor-not-allowed",
									)}
								>
									<MessageCircleQuestion className="h-3.5 w-3.5" />
									Generar FAQ con IA
								</button>
							</div>
						</TabsContent>

						<TabsContent value="seo" className="mt-4 space-y-4">
							<SeoScorePanel
								focusKeyword={focusKeyword}
								onFocusKeywordChange={setFocusKeyword}
								title={seoTitle || title}
								slug={slug}
								metaDescription={metaDescription}
								contentHtml={contentHtml}
								featuredImageAlt={featuredImageAlt || null}
								schemaType={schemaType}
							/>

							<GoogleSnippetPreview
								title={seoTitle || title}
								metaDescription={metaDescription}
								slug={slug}
								canonical={canonical}
							/>

							{/* Campos SEO básicos */}
							<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 space-y-4">
								<h4 className="text-sm font-semibold text-gray-900 dark:text-white">
									Meta tags
								</h4>
								<div className="space-y-1.5">
									<div className="flex items-center justify-between">
										<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
											SEO title
										</label>
										<AiSuggestionPopover
											endpoint={POSTS_AI_GENERATE_TITLES_ENDPOINT}
											body={{
												title,
												contentHtml,
												focusKeyword,
												kind: "seo",
											}}
											extract={(d) => d.variants || []}
											onPick={(v) => setSeoTitle(v.text.slice(0, 60))}
											label="Generar"
											title="Variantes de SEO title"
											validate={() =>
												!title.trim()
													? "Necesitás un título base para generar"
													: null
											}
										/>
									</div>
									<Input
										value={seoTitle}
										onChange={(e) => setSeoTitle(e.target.value)}
										maxLength={60}
										placeholder="Dejá vacío para usar el título del post"
										className="h-9"
									/>
									<p className="text-[11px] text-gray-400">
										{seoTitle.length}/60 caracteres
									</p>
								</div>

								<div className="space-y-1.5">
									<div className="flex items-center justify-between">
										<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
											Meta description
										</label>
										<AiSuggestionPopover
											endpoint={POSTS_AI_GENERATE_META_ENDPOINT}
											body={{ title, contentHtml, focusKeyword }}
											extract={(d) => d.variants || []}
											onPick={(v) => setMetaDescription(v.text.slice(0, 160))}
											label="Generar"
											title="Variantes de meta description"
											validate={() =>
												!title.trim() || !contentHtml.trim()
													? "Necesitás título y contenido para generar"
													: null
											}
										/>
									</div>
									<textarea
										value={metaDescription}
										onChange={(e) => setMetaDescription(e.target.value)}
										maxLength={160}
										rows={2}
										placeholder="Descripción que aparece debajo del título en Google"
										className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
									/>
									<p className="text-[11px] text-gray-400">
										{metaDescription.length}/160 caracteres — ideal 120–160
									</p>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
										Keywords (opcional)
									</label>
									<Input
										value={seoKeywords}
										onChange={(e) => setSeoKeywords(e.target.value)}
										maxLength={255}
										placeholder="separadas, por, coma"
										className="h-9"
									/>
								</div>
							</div>

							{/* OG / Twitter */}
							<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 space-y-4">
								<h4 className="text-sm font-semibold text-gray-900 dark:text-white">
									Open Graph (Facebook, LinkedIn, WhatsApp)
								</h4>
								<div className="space-y-1.5">
									<div className="flex items-center justify-between">
										<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
											OG title
										</label>
										<AiSuggestionPopover
											endpoint={POSTS_AI_GENERATE_TITLES_ENDPOINT}
											body={{
												title,
												contentHtml,
												focusKeyword,
												kind: "og",
											}}
											extract={(d) => d.variants || []}
											onPick={(v) => setOgTitle(v.text.slice(0, 60))}
											label="Generar"
											title="Variantes de OG title"
											validate={() =>
												!title.trim()
													? "Necesitás un título base para generar"
													: null
											}
										/>
									</div>
									<Input
										value={ogTitle}
										onChange={(e) => setOgTitle(e.target.value)}
										maxLength={60}
										placeholder="Dejá vacío para usar el SEO title"
										className="h-9"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
										OG description
									</label>
									<textarea
										value={ogDescription}
										onChange={(e) => setOgDescription(e.target.value)}
										maxLength={160}
										rows={2}
										className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
									/>
								</div>
								<FeaturedImageUploader
									label="OG image"
									value={ogImage}
									onChange={setOgImage}
									slugHint={slug ? `${slug}-og` : undefined}
									help="Si dejás vacío se usa la imagen destacada. Tamaño ideal 1200×630."
								/>
							</div>

							<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 space-y-4">
								<h4 className="text-sm font-semibold text-gray-900 dark:text-white">
									X / Twitter
								</h4>
								<div className="space-y-1.5">
									<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
										Twitter title
									</label>
									<Input
										value={twitterTitle}
										onChange={(e) => setTwitterTitle(e.target.value)}
										maxLength={60}
										placeholder="Dejá vacío para reusar OG title"
										className="h-9"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
										Twitter description
									</label>
									<textarea
										value={twitterDescription}
										onChange={(e) => setTwitterDescription(e.target.value)}
										maxLength={160}
										rows={2}
										className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
									/>
								</div>
								<FeaturedImageUploader
									label="Twitter image"
									value={twitterImage}
									onChange={setTwitterImage}
									slugHint={slug ? `${slug}-tw` : undefined}
									help="Si dejás vacío se usa la OG image."
								/>
							</div>

							<OgTwitterPreview
								ogTitle={ogTitle || seoTitle || title}
								ogDescription={ogDescription || metaDescription}
								ogImage={ogImage || featuredImageUrl}
								twitterTitle={twitterTitle}
								twitterDescription={twitterDescription}
								twitterImage={twitterImage}
							/>
						</TabsContent>
					</Tabs>
				</div>

				{/* Sidebar */}
				<div className="space-y-4">
					<PublishingSidebar
						status={status}
						publishedAt={publishedAt}
						noindex={noindex}
						nofollow={nofollow}
						canonical={canonical}
						schemaType={schemaType}
						onStatusChange={setStatus}
						onPublishedAtChange={setPublishedAt}
						onNoindexChange={setNoindex}
						onNofollowChange={setNofollow}
						onCanonicalChange={setCanonical}
						onSchemaTypeChange={setSchemaType}
					/>

					<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 space-y-3 shadow-sm">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							Autoría
						</h3>
						<AuthorSelector
							value={authorId}
							onChange={(id, a) => {
								setAuthorId(id);
								setAuthorName(a?.name ?? "");
							}}
						/>
					</div>

					<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 space-y-3 shadow-sm">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							Imagen destacada
						</h3>
						<FeaturedImageUploader
							label=""
							value={featuredImageUrl}
							onChange={(url) => {
								setFeaturedImageUrl(url);
								if (!url) {
									setFeaturedImageWidth(null);
									setFeaturedImageHeight(null);
								}
							}}
							onUploaded={(info) => {
								setFeaturedImageWidth(info.width ?? null);
								setFeaturedImageHeight(info.height ?? null);
							}}
							slugHint={slug}
						/>
						<div className="space-y-1.5">
							<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
								Alt text
							</label>
							<Input
								value={featuredImageAlt}
								onChange={(e) => setFeaturedImageAlt(e.target.value)}
								placeholder="Descripción de la imagen para SEO y accesibilidad"
								className="h-9 text-sm"
							/>
						</div>
					</div>

					<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 space-y-3 shadow-sm">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							Taxonomía
						</h3>
						<CategoryTagInput
							label="Categorías"
							value={categories}
							onChange={setCategories}
							suggestions={categoriesSuggestions}
							placeholder="ej: derecho laboral"
						/>
						<CategoryTagInput
							label="Tags"
							value={tags}
							onChange={setTags}
							suggestions={tagsSuggestions}
							placeholder="ej: indemnización"
						/>
					</div>
				</div>
			</div>

			<BlogPostPreview
				open={previewOpen}
				onClose={() => setPreviewOpen(false)}
				post={{
					title,
					slug,
					excerpt,
					contentHtml,
					featuredImageUrl,
					featuredImageAlt,
					authorName: session?.user?.name || initialPost?.authorName || "",
					categories,
					date: initialPost?.date,
					publishedAt: publishedAt || initialPost?.publishedAt,
				}}
			/>

			<AiFaqGeneratorDialog
				open={faqDialogOpen}
				onClose={() => setFaqDialogOpen(false)}
				title={title}
				contentHtml={contentHtml}
				focusKeyword={focusKeyword}
				onInsert={(faqHtml) => {
					setContentHtml((prev) => `${prev}\n${faqHtml}`);
				}}
			/>

			<AiInternalLinksDialog
				open={linksDialogOpen}
				onClose={() => setLinksDialogOpen(false)}
				title={title}
				contentHtml={contentHtml}
				onApply={(newHtml) => setContentHtml(newHtml)}
			/>
		</form>
	);
}
