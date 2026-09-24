// =============================================================================
// Blog / Post types — refleja el `model Post` del backend (legalistas_backend)
// =============================================================================

export type PostStatus = "publish" | "draft" | "future";

export type PostSchemaType =
	| "BlogPosting"
	| "Article"
	| "NewsArticle"
	| "HowTo"
	| "FAQPage";

export interface PostTerm {
	id: number;
	name: string;
	slug: string;
}

export interface Post {
	id: number;
	wpId: number;
	slug: string;
	status: PostStatus;
	type: string;
	link: string;
	title: string;
	excerpt: string;
	contentHtml: string;
	date: string;
	modified: string;
	authorId: number;
	authorName: string;

	// Featured image
	featuredImageUrl: string | null;
	featuredImageAlt: string | null;
	featuredImageWidth: number | null;
	featuredImageHeight: number | null;

	// Taxonomía. Vienen como string JSON desde el backend (LongText).
	// El admin debe parsearlas con JSON.parse antes de usarlas.
	categories: string | PostTerm[];
	tags: string | PostTerm[];

	// SEO editable
	seoTitle: string | null;
	metaDescription: string | null;
	seoKeywords: string | null;
	ogTitle: string | null;
	ogDescription: string | null;
	ogImage: string | null;
	twitterTitle: string | null;
	twitterDescription: string | null;
	twitterImage: string | null;

	// SEO avanzado (admin)
	publishedAt: string | null;
	focusKeyword: string | null;
	canonical: string | null;
	noindex: boolean;
	nofollow: boolean;
	schemaType: PostSchemaType;

	// Yoast (read-only, importado de WP)
	yoastHeadHtml: string | null;
	yoastHeadJson: string | null;
	yoastSchema: string | null;
	yoastOg: string | null;
	yoastTwitter: string | null;
	yoastRobots: string | null;
	yoastMeta: string | null;

	createdAt: string;
}

export interface PostListResponse {
	posts: Post[];
	pagination: {
		page: number;
		per_page: number;
		total: number;
		total_pages: number;
		has_next: boolean;
		has_prev: boolean;
	};
}

export interface PostFiltersState {
	search: string;
	status: PostStatus | "any";
	category: string;
	tag: string;
	orderby: "date" | "modified";
	order: "asc" | "desc";
}

export interface PostAuthor {
	id: number;
	name: string;
	image: string | null;
	bio: string | null;
	jobTitle: string | null;
	linkedinUrl: string | null;
	twitterUrl: string | null;
}

export interface SlugCheckResponse {
	available: boolean;
	reason?: "taken" | "invalid_format";
	error?: string;
}

// =============================================================================
// AI responses (POST /posts/ai/*)
// =============================================================================

export interface AiSeoAnalysisSuggestion {
	title: string;
	detail: string;
	priority: "high" | "medium" | "low";
}

export interface AiSeoAnalysisResponse {
	score: number; // 0-100
	strengths: string[];
	weaknesses: string[];
	suggestions: AiSeoAnalysisSuggestion[];
	model: string;
}

export interface AiVariant {
	text: string;
	reasoning: string;
}

export interface AiMetaResponse {
	variants: AiVariant[];
	model: string;
}

export interface AiTitlesResponse {
	variants: AiVariant[];
	kind: "seo" | "og";
	model: string;
}

export interface AiKeywordCandidate {
	keyword: string;
	reasoning: string;
	intent: "informational" | "transactional" | "navigational" | "commercial";
}

export interface AiKeywordResponse {
	candidates: AiKeywordCandidate[];
	model: string;
}

export interface AiFaqQuestion {
	question: string;
	answer: string;
}

export interface AiFaqResponse {
	questions: AiFaqQuestion[];
	model: string;
}

export interface AiInternalLinkSuggestion {
	targetId: number;
	targetSlug: string;
	anchorText: string;
	reasoning: string;
}

export interface AiInternalLinksResponse {
	suggestions: AiInternalLinkSuggestion[];
	model: string;
}
