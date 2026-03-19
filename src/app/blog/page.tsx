"use client";

import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Search,
	Tag,
	User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
	POSTS_CATEGORIES_ENDPOINT,
	POSTS_ENDPOINT,
	POSTS_TAGS_ENDPOINT,
} from "@/constant/api-endpoints";

interface Post {
	id: number;
	slug: string;
	title: string;
	excerpt: string;
	contentHtml: string;
	date: string;
	authorName: string;
	featuredImageUrl: string | null;
	categories: Array<{ id: number; name: string; slug: string }>;
	tags: Array<{ id: number; name: string; slug: string }>;
}

interface Pagination {
	page: number;
	per_page: number;
	total: number;
	total_pages: number;
	has_next: boolean;
	has_prev: boolean;
}

export default function BlogPage() {
	const [posts, setPosts] = useState<Post[]>([]);
	const [categories, setCategories] = useState<any[]>([]);
	const [tags, setTags] = useState<any[]>([]);
	const [pagination, setPagination] = useState<Pagination | null>(null);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("");
	const [selectedTag, setSelectedTag] = useState("");
	const [currentPage, setCurrentPage] = useState(1);

	useEffect(() => {
		fetchCategories();
		fetchTags();
	}, []);

	useEffect(() => {
		fetchPosts();
	}, [currentPage, selectedCategory, selectedTag, searchQuery]);

	const fetchPosts = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				page: currentPage.toString(),
				per_page: "9",
				...(searchQuery && { search: searchQuery }),
				...(selectedCategory && { category: selectedCategory }),
				...(selectedTag && { tag: selectedTag }),
			});

			const response = await fetch(`${POSTS_ENDPOINT}?${params}`);
			const data = await response.json();

			setPosts(data.posts);
			setPagination(data.pagination);
		} catch (error) {
			console.error("Error fetching posts:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchCategories = async () => {
		try {
			const response = await fetch(POSTS_CATEGORIES_ENDPOINT);
			const data = await response.json();
			setCategories(data);
		} catch (error) {
			console.error("Error fetching categories:", error);
		}
	};

	const fetchTags = async () => {
		try {
			const response = await fetch(POSTS_TAGS_ENDPOINT);
			const data = await response.json();
			setTags(data);
		} catch (error) {
			console.error("Error fetching tags:", error);
		}
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setCurrentPage(1);
		fetchPosts();
	};

	const stripHtml = (html: string) => {
		return html.replace(/<[^>]*>/g, "").substring(0, 150) + "...";
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("es-ES", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b">
				<div className="container mx-auto px-4 py-8">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">Blog Legal</h1>
					<p className="text-gray-600">
						Noticias, artículos y recursos legales
					</p>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
					{/* Sidebar */}
					<aside className="lg:col-span-1">
						{/* Search */}
						<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
							<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Search className="w-5 h-5" />
								Buscar
							</h3>
							<form onSubmit={handleSearch}>
								<input
									type="text"
									placeholder="Buscar posts..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</form>
						</div>

						{/* Categories */}
						<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
							<h3 className="font-semibold text-gray-900 mb-4">Categorías</h3>
							<div className="space-y-2">
								<button
									onClick={() => {
										setSelectedCategory("");
										setCurrentPage(1);
									}}
									className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
										!selectedCategory
											? "bg-blue-50 text-blue-600"
											: "text-gray-700"
									}`}
								>
									Todas
								</button>
								{categories.map((cat) => (
									<button
										key={cat.id}
										onClick={() => {
											setSelectedCategory(cat.slug);
											setCurrentPage(1);
										}}
										className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
											selectedCategory === cat.slug
												? "bg-blue-50 text-blue-600"
												: "text-gray-700"
										}`}
									>
										{cat.name}
									</button>
								))}
							</div>
						</div>

						{/* Tags */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Tag className="w-5 h-5" />
								Etiquetas
							</h3>
							<div className="flex flex-wrap gap-2">
								{tags.slice(0, 20).map((tag) => (
									<button
										key={tag.id}
										onClick={() => {
											setSelectedTag(tag.slug);
											setCurrentPage(1);
										}}
										className={`px-3 py-1 text-sm rounded-full ${
											selectedTag === tag.slug
												? "bg-blue-500 text-white"
												: "bg-gray-100 text-gray-700 hover:bg-gray-200"
										}`}
									>
										{tag.name}
									</button>
								))}
							</div>
						</div>
					</aside>

					{/* Main Content */}
					<main className="lg:col-span-3">
						{/* Filters Active */}
						{(selectedCategory || selectedTag || searchQuery) && (
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 text-sm text-blue-800">
										<span>Filtros activos:</span>
										{searchQuery && (
											<span className="bg-white px-3 py-1 rounded">
												Búsqueda: {searchQuery}
											</span>
										)}
										{selectedCategory && (
											<span className="bg-white px-3 py-1 rounded">
												Categoría:{" "}
												{
													categories.find((c) => c.slug === selectedCategory)
														?.name
												}
											</span>
										)}
										{selectedTag && (
											<span className="bg-white px-3 py-1 rounded">
												Tag: {tags.find((t) => t.slug === selectedTag)?.name}
											</span>
										)}
									</div>
									<button
										onClick={() => {
											setSearchQuery("");
											setSelectedCategory("");
											setSelectedTag("");
											setCurrentPage(1);
										}}
										className="text-blue-600 hover:text-blue-800 text-sm font-medium"
									>
										Limpiar filtros
									</button>
								</div>
							</div>
						)}

						{/* Posts Grid */}
						{loading ? (
							<div className="text-center py-12">
								<div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500"></div>
								<p className="mt-4 text-gray-600">Cargando posts...</p>
							</div>
						) : posts.length === 0 ? (
							<div className="bg-white rounded-lg shadow-sm p-12 text-center">
								<p className="text-gray-600 text-lg">No se encontraron posts</p>
							</div>
						) : (
							<>
								<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
									{posts.map((post) => (
										<article
											key={post.id}
											className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
										>
											<Link href={`/blog/${post.slug}`}>
												{post.featuredImageUrl ? (
													<div className="relative h-48 bg-gray-200">
														<Image
															src={post.featuredImageUrl}
															alt={post.title}
															fill
															className="object-cover"
														/>
													</div>
												) : (
													<div className="h-48 bg-linear-to-br from-blue-500 to-purple-600" />
												)}
											</Link>

											<div className="p-5">
												{/* Categories */}
												{post.categories.length > 0 && (
													<div className="flex flex-wrap gap-2 mb-3">
														{post.categories.slice(0, 2).map((cat) => (
															<span
																key={cat.id}
																className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
															>
																{cat.name}
															</span>
														))}
													</div>
												)}

												{/* Title */}
												<Link href={`/blog/${post.slug}`}>
													<h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 line-clamp-2">
														{post.title}
													</h2>
												</Link>

												{/* Excerpt */}
												<p className="text-gray-600 text-sm mb-4 line-clamp-3">
													{stripHtml(post.excerpt)}
												</p>

												{/* Meta */}
												<div className="flex items-center gap-4 text-xs text-gray-500 border-t pt-4">
													<div className="flex items-center gap-1">
														<User className="w-3 h-3" />
														<span>{post.authorName}</span>
													</div>
													<div className="flex items-center gap-1">
														<Calendar className="w-3 h-3" />
														<span>{formatDate(post.date)}</span>
													</div>
												</div>
											</div>
										</article>
									))}
								</div>

								{/* Pagination */}
								{pagination && pagination.total_pages > 1 && (
									<div className="flex items-center justify-center gap-2">
										<button
											onClick={() =>
												setCurrentPage((prev) => Math.max(1, prev - 1))
											}
											disabled={!pagination.has_prev}
											className="px-4 py-2 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<ChevronLeft className="w-5 h-5" />
										</button>

										<div className="flex gap-2">
											{Array.from(
												{ length: pagination.total_pages },
												(_, i) => i + 1,
											)
												.filter(
													(page) =>
														page === 1 ||
														page === pagination.total_pages ||
														Math.abs(page - currentPage) <= 2,
												)
												.map((page, idx, arr) => (
													<>
														{idx > 0 && arr[idx - 1] !== page - 1 && (
															<span
																key={`ellipsis-${page}`}
																className="px-3 py-2"
															>
																...
															</span>
														)}
														<button
															key={page}
															onClick={() => setCurrentPage(page)}
															className={`px-4 py-2 rounded ${
																currentPage === page
																	? "bg-blue-500 text-white"
																	: "bg-white border hover:bg-gray-50"
															}`}
														>
															{page}
														</button>
													</>
												))}
										</div>

										<button
											onClick={() =>
												setCurrentPage((prev) =>
													Math.min(pagination.total_pages, prev + 1),
												)
											}
											disabled={!pagination.has_next}
											className="px-4 py-2 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<ChevronRight className="w-5 h-5" />
										</button>
									</div>
								)}

								{/* Results Info */}
								{pagination && (
									<p className="text-center text-sm text-gray-600 mt-4">
										Mostrando {(currentPage - 1) * pagination.per_page + 1} -{" "}
										{Math.min(
											currentPage * pagination.per_page,
											pagination.total,
										)}{" "}
										de {pagination.total} posts
									</p>
								)}
							</>
						)}
					</main>
				</div>
			</div>
		</div>
	);
}
