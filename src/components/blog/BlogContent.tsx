"use client";

import { Terminal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
	POSTS_CATEGORIES_ENDPOINT,
	POSTS_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	Post,
	PostFiltersState,
	PostListResponse,
	PostTerm,
} from "@/types/blog";
import { BlogBulkBar } from "./BlogBulkBar";
import { BlogFilters } from "./BlogFilters";
import { BlogHeader } from "./BlogHeader";
import { BlogTable } from "./BlogTable";

const PER_PAGE = 20;

export default function BlogContent() {
	const { data: session } = useSession();

	const [posts, setPosts] = useState<Post[]>([]);
	const [categories, setCategories] = useState<PostTerm[]>([]);
	const [pagination, setPagination] = useState({
		page: 1,
		per_page: PER_PAGE,
		total: 0,
		total_pages: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [filters, setFilters] = useState<PostFiltersState>({
		search: "",
		status: "any",
		category: "",
		tag: "",
		orderby: "date",
		order: "desc",
	});

	// Selección múltiple para bulk ops.
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

	const toggleSelect = (id: number) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleSelectAll = () => {
		setSelectedIds((prev) => {
			const allVisibleSelected = posts.every((p) => prev.has(p.id));
			if (allVisibleSelected) {
				const next = new Set(prev);
				for (const p of posts) next.delete(p.id);
				return next;
			}
			const next = new Set(prev);
			for (const p of posts) next.add(p.id);
			return next;
		});
	};

	const clearSelection = () => setSelectedIds(new Set());

	const fetchPosts = useCallback(
		async (page: number) => {
			if (!session?.user?.accessToken) return;
			setLoading(true);
			setError(null);
			try {
				const url = new URL(POSTS_ENDPOINT, window.location.origin);
				url.searchParams.set("page", String(page));
				url.searchParams.set("per_page", String(PER_PAGE));
				url.searchParams.set("status", filters.status);
				url.searchParams.set("orderby", filters.orderby);
				url.searchParams.set("order", filters.order);
				if (filters.search) url.searchParams.set("search", filters.search);
				if (filters.category) url.searchParams.set("category", filters.category);
				if (filters.tag) url.searchParams.set("tag", filters.tag);

				const res = await fetch(url.toString(), {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});
				if (!res.ok) throw new Error(`Error ${res.status}`);
				const data: PostListResponse = await res.json();
				setPosts(data.posts);
				setPagination(data.pagination);
			} catch (err) {
				console.error("[blog] fetchPosts:", err);
				setError("No se pudieron cargar los posts");
			} finally {
				setLoading(false);
			}
		},
		[session?.user?.accessToken, filters],
	);

	const fetchCategories = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		try {
			const res = await fetch(POSTS_CATEGORIES_ENDPOINT, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			});
			if (!res.ok) return;
			const data: PostTerm[] = await res.json();
			// Ordenar alfabéticamente y dedupe por slug por las dudas.
			const seen = new Set<string>();
			const unique = data.filter((c) => {
				if (seen.has(c.slug)) return false;
				seen.add(c.slug);
				return true;
			});
			unique.sort((a, b) => a.name.localeCompare(b.name));
			setCategories(unique);
		} catch (err) {
			console.error("[blog] fetchCategories:", err);
		}
	}, [session?.user?.accessToken]);

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	useEffect(() => {
		fetchPosts(1);
	}, [fetchPosts]);

	const handlePageChange = (page: number) => {
		if (page < 1 || page > pagination.total_pages) return;
		fetchPosts(page);
	};

	return (
		<div className="space-y-6">
			<BlogHeader />

			<BlogFilters
				filters={filters}
				onFiltersChange={setFilters}
				categories={categories}
			/>

			{error && (
				<Alert variant="destructive">
					<Terminal className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{loading && posts.length === 0 ? (
				<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
					<div className="bg-gray-50 dark:bg-white/5 px-4 py-3 flex gap-4">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-20" />
					</div>
					{Array.from({ length: 8 }).map((_, i) => (
						<div
							key={i}
							className="flex items-center gap-4 px-4 py-3.5 border-t border-gray-100 dark:border-gray-800"
						>
							<Skeleton className="h-12 w-16 rounded-md" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
							<Skeleton className="h-6 w-20 rounded-full" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-16" />
						</div>
					))}
				</div>
			) : (
				<div className="relative">
					{loading && (
						<div className="absolute inset-0 bg-background/60 z-10 rounded-xl backdrop-blur-[1px]" />
					)}
					<BlogTable
						posts={posts}
						pagination={pagination}
						onPageChange={handlePageChange}
						onRefresh={() => fetchPosts(pagination.page)}
						selectedIds={selectedIds}
						onToggleSelect={toggleSelect}
						onToggleSelectAll={toggleSelectAll}
					/>
				</div>
			)}

			<BlogBulkBar
				selectedIds={Array.from(selectedIds)}
				onClear={clearSelection}
				onChanged={() => {
					clearSelection();
					fetchPosts(pagination.page);
				}}
			/>
		</div>
	);
}
