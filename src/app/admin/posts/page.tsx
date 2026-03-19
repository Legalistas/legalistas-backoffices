"use client";

import { Edit, Eye, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { POST_BY_ID_ENDPOINT, POSTS_ENDPOINT } from "@/constant/api-endpoints";

interface Post {
	id: number;
	slug: string;
	title: string;
	status: string;
	date: string;
	authorName: string;
	featuredImageUrl?: string;
}

export default function PostsAdminPage() {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [posts, setPosts] = useState<Post[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [perPage, setPerPage] = useState(12);
	const [totalPages, setTotalPages] = useState(1);
	const [totalPosts, setTotalPosts] = useState(0);

	useEffect(() => {
		fetchPosts();
	}, [statusFilter, currentPage, perPage]);

	const fetchPosts = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				page: currentPage.toString(),
				per_page: perPage.toString(),
				...(statusFilter && { status: statusFilter }),
				...(searchQuery && { search: searchQuery }),
			});

			const response = await fetch(`${POSTS_ENDPOINT}?${params}`);
			const data = await response.json();
			setPosts(data.posts || []);
			setTotalPages(data.pagination?.total_pages || 1);
			setTotalPosts(data.pagination?.total || 0);
		} catch (error) {
			console.error("Error fetching posts:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!(await confirm({ description: "¿Estás seguro de eliminar este post?", confirmLabel: "Eliminar" }))) return;

		try {
			const response = await fetch(POST_BY_ID_ENDPOINT(id), {
				method: "DELETE",
				credentials: "include",
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (response.ok) {
				toast.success("Post eliminado exitosamente");
				fetchPosts();
			} else {
				toast.error("Error al eliminar el post");
			}
		} catch (error) {
			console.error("Error deleting post:", error);
			toast.error("Error al eliminar el post");
		}
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("es-ES", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const translateStatus = (status: string) => {
		const translations: any = {
			publish: "Publicado",
			draft: "Borrador",
			pending: "Pendiente",
			private: "Privado",
		};
		return translations[status] || status;
	};

	const getStatusBadge = (status: string) => {
		const colors: any = {
			publish: "bg-green-100 text-green-800",
			draft: "bg-gray-100 text-gray-800",
			pending: "bg-yellow-100 text-yellow-800",
			private: "bg-red-100 text-red-800",
		};
		return colors[status] || colors.draft;
	};

	return (
		<>
		<div className="min-h-screen">
			<div className="mx-auto">
				{/* Header */}
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Administrar Posts
						</h1>
						<p className="text-gray-600 mt-1">Gestiona el contenido del blog</p>
					</div>
					<Link
						href="/admin/posts/new"
						className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
					>
						<Plus className="w-5 h-5" />
						Nuevo Post
					</Link>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-lg shadow-sm p-4 mb-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="md:col-span-2">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
								<input
									type="text"
									placeholder="Buscar posts..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && fetchPosts()}
									className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Todos los estados</option>
							<option value="publish">Publicados</option>
							<option value="draft">Borradores</option>
							<option value="pending">Pendientes</option>
							<option value="private">Privados</option>
						</select>
					</div>
				</div>

				{/* Posts Table */}
				<div className="bg-white rounded-lg shadow-sm overflow-hidden">
					{loading ? (
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500"></div>
							<p className="mt-4 text-gray-600">Cargando posts...</p>
						</div>
					) : posts.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-gray-600 text-lg">No se encontraron posts</p>
							<Link
								href="/admin/posts/new"
								className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
							>
								<Plus className="w-4 h-4" />
								Crear tu primer post
							</Link>
						</div>
					) : (
						<table className="w-full">
							<thead className="bg-gray-50 border-b">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
										Imagen
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
										Título
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
										Autor
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
										Estado
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
										Fecha
									</th>
									<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
										Acciones
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{posts.map((post) => (
									<tr key={post.id} className="hover:bg-gray-50">
										<td className="px-6 py-4">
											{post.featuredImageUrl ? (
												<Image
													src={post.featuredImageUrl}
													alt={post.title}
													width={64}
													height={64}
													className="w-16 h-16 object-cover rounded"
												/>
											) : (
												<div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
													Sin imagen
												</div>
											)}
										</td>
										<td className="px-6 py-4">
											<div className="text-sm font-medium text-gray-900">
												{post.title}
											</div>
											<div className="text-sm text-gray-500">/{post.slug}</div>
										</td>
										<td className="px-6 py-4 text-sm text-gray-600">
											{post.authorName}
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
													post.status,
												)}`}
											>
												{translateStatus(post.status)}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-gray-600">
											{formatDate(post.date)}
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center justify-end gap-2">
												<Link
													href={`/blog/${post.slug}`}
													target="_blank"
													className="p-2 text-gray-600 hover:text-blue-600"
													title="Ver post"
												>
													<Eye className="w-4 h-4" />
												</Link>
												<Link
													href={`/admin/posts/edit/${post.id}`}
													className="p-2 text-gray-600 hover:text-blue-600"
													title="Editar"
												>
													<Edit className="w-4 h-4" />
												</Link>
												<button
													onClick={() => handleDelete(post.id)}
													className="p-2 text-gray-600 hover:text-red-600"
													title="Eliminar"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}

					{/* Paginación */}
					{!loading && posts.length > 0 && (
						<div className="px-6 py-4 border-t">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-4">
									<p className="text-sm text-gray-600">
										Mostrando {(currentPage - 1) * perPage + 1} a{" "}
										{Math.min(currentPage * perPage, totalPosts)} de{" "}
										{totalPosts} posts
									</p>
									<select
										value={perPage}
										onChange={(e) => {
											setPerPage(parseInt(e.target.value));
											setCurrentPage(1);
										}}
										className="px-3 py-1 border rounded text-sm"
									>
										<option value="6">6 por página</option>
										<option value="12">12 por página</option>
										<option value="24">24 por página</option>
										<option value="50">50 por página</option>
									</select>
								</div>
								<div className="flex gap-2">
									<button
										onClick={() =>
											setCurrentPage((prev) => Math.max(1, prev - 1))
										}
										disabled={currentPage === 1}
										className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Anterior
									</button>
									<div className="flex gap-1">
										{Array.from({ length: totalPages }, (_, i) => i + 1).map(
											(page) => (
												<button
													key={page}
													onClick={() => setCurrentPage(page)}
													className={`px-3 py-2 rounded-lg ${
														currentPage === page
															? "bg-blue-500 text-white"
															: "border hover:bg-gray-50"
													}`}
												>
													{page}
												</button>
											),
										)}
									</div>
									<button
										onClick={() =>
											setCurrentPage((prev) => Math.min(totalPages, prev + 1))
										}
										disabled={currentPage === totalPages}
										className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Siguiente
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
		{ConfirmationDialog}
		</>
	);
}
