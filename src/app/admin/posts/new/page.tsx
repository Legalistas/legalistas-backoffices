"use client";

import { Editor } from "@tinymce/tinymce-react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Plus, Save, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { POSTS_ENDPOINT } from "@/constant/api-endpoints";

export default function NewPostPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const editorRef = useRef<any>(null);

	const [formData, setFormData] = useState({
		title: "",
		slug: "",
		excerpt: "",
		contentHtml: "",
		status: "draft",
		featuredImageUrl: "",
		featuredImageAlt: "",
		featuredImageWidth: null as number | null,
		featuredImageHeight: null as number | null,
		authorName: "Admin",
		// SEO
		seoTitle: "",
		metaDescription: "",
		seoKeywords: "",
		// Open Graph
		ogTitle: "",
		ogDescription: "",
		ogImage: "",
		// Twitter Card
		twitterTitle: "",
		twitterDescription: "",
		twitterImage: "",
	});

	const [categories, setCategories] = useState<
		Array<{ id: number; name: string; slug: string }>
	>([]);
	const [tags, setTags] = useState<
		Array<{ id: number; name: string; slug: string }>
	>([]);
	const [newCategoryName, setNewCategoryName] = useState("");
	const [newTagName, setNewTagName] = useState("");
	const [saving, setSaving] = useState(false);

	// Auto-generar slug desde el título
	useEffect(() => {
		if (formData.title && !formData.slug) {
			const slug = formData.title
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "")
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
				.trim();
			setFormData((prev) => ({ ...prev, slug }));
		}
	}, [formData.title]);

	const handleAddCategory = () => {
		if (!newCategoryName.trim()) return;
		const slug = newCategoryName.toLowerCase().replace(/\s+/g, "-");
		const newCategory = {
			id: Date.now(),
			name: newCategoryName,
			slug,
		};
		setCategories([...categories, newCategory]);
		setNewCategoryName("");
	};

	const handleRemoveCategory = (id: number) => {
		setCategories(categories.filter((c) => c.id !== id));
	};

	const handleAddTag = () => {
		if (!newTagName.trim()) return;
		const slug = newTagName.toLowerCase().replace(/\s+/g, "-");
		const newTag = {
			id: Date.now(),
			name: newTagName,
			slug,
		};
		setTags([...tags, newTag]);
		setNewTagName("");
	};

	const handleRemoveTag = (id: number) => {
		setTags(tags.filter((t) => t.id !== id));
	};

	const handleSubmit = async (publishStatus?: string) => {
		try {
			setSaving(true);

			// Obtener contenido del editor
			const content = editorRef.current
				? editorRef.current.getContent()
				: formData.contentHtml;

			// Validaciones
			if (!formData.title || !formData.slug || !content) {
				toast.error(
					"Por favor completa los campos requeridos: Título, Slug y Contenido",
				);
				setSaving(false);
				return;
			}

			const postData = {
				...formData,
				contentHtml: content,
				status: publishStatus || formData.status,
				categories,
				tags,
				featuredImageWidth: formData.featuredImageWidth,
				featuredImageHeight: formData.featuredImageHeight,
			};

			const response = await fetch(POSTS_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				credentials: "include",
				body: JSON.stringify(postData),
			});

			if (response.ok) {
				toast.success("Post creado exitosamente");
				router.push("/admin/posts");
			} else {
				const error = await response.json();
				toast.error(`Error: ${error.error || "No se pudo crear el post"}`);
			}
		} catch (error) {
			console.error("Error creating post:", error);
			toast.error("Error al crear el post");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b sticky top-0 z-10">
				<div className="max-w-7xl mx-auto px-8 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<button
								onClick={() => router.push("/admin/posts")}
								className="p-2 hover:bg-gray-100 rounded-lg"
							>
								<ArrowLeft className="w-5 h-5" />
							</button>
							<div>
								<h1 className="text-2xl font-bold text-gray-900">Nuevo Post</h1>
								<p className="text-sm text-gray-600">
									Crea un nuevo artículo para el blog
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								onClick={() => handleSubmit("draft")}
								disabled={saving}
								className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
							>
								Guardar Borrador
							</button>
							<button
								onClick={() => handleSubmit("publish")}
								disabled={saving}
								className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
							>
								<Save className="w-4 h-4" />
								Publicar
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-8 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-6">
						{/* Title */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Título *
							</label>
							<input
								type="text"
								value={formData.title}
								onChange={(e) =>
									setFormData({ ...formData, title: e.target.value })
								}
								placeholder="Escribe el título del post..."
								className="w-full px-4 py-3 text-2xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{/* Slug */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Slug (URL) *
							</label>
							<div className="flex items-center gap-2">
								<span className="text-gray-500">/blog/</span>
								<input
									type="text"
									value={formData.slug}
									onChange={(e) =>
										setFormData({ ...formData, slug: e.target.value })
									}
									placeholder="url-amigable"
									className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>

						{/* Excerpt */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Extracto
							</label>
							<Editor
								apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
								value={formData.excerpt}
								onEditorChange={(content) =>
									setFormData({ ...formData, excerpt: content })
								}
								init={{
									height: 200,
									menubar: false,
									language: "es",
									plugins: ["link", "lists", "paste"],
									toolbar:
										"bold italic | bullist numlist | link | removeformat",
									content_style:
										'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px }',
									paste_as_text: true,
								}}
							/>
						</div>

						{/* Content Editor */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Contenido *
							</label>
							<Editor
								apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
								onInit={(evt, editor) => (editorRef.current = editor)}
								init={{
									height: 600,
									menubar: true,
									language: "es",
									plugins: [
										"advlist",
										"autolink",
										"lists",
										"link",
										"image",
										"charmap",
										"preview",
										"anchor",
										"searchreplace",
										"visualblocks",
										"code",
										"fullscreen",
										"insertdatetime",
										"media",
										"table",
										"code",
										"help",
										"wordcount",
									],
									toolbar:
										"undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | removeformat | code | help",
									content_style:
										'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 16px; line-height: 1.6; }',
								}}
							/>
						</div>
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Status */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Estado
							</label>
							<select
								value={formData.status}
								onChange={(e) =>
									setFormData({ ...formData, status: e.target.value })
								}
								className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="draft">Borrador</option>
								<option value="publish">Publicado</option>
								<option value="pending">Pendiente</option>
								<option value="private">Privado</option>
							</select>
						</div>

						{/* Featured Image */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Imagen Destacada
							</label>
							<input
								type="url"
								value={formData.featuredImageUrl}
								onChange={(e) =>
									setFormData({ ...formData, featuredImageUrl: e.target.value })
								}
								placeholder="https://ejemplo.com/imagen.jpg"
								className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
							/>
							{formData.featuredImageUrl && (
								<div className="mt-2 relative w-full h-48">
									<Image
										src={formData.featuredImageUrl}
										alt="Preview"
										fill
										className="object-cover rounded-lg"
										onLoad={(e) => {
											const img = e.target as HTMLImageElement;
											setFormData((prev) => ({
												...prev,
												featuredImageWidth: img.naturalWidth,
												featuredImageHeight: img.naturalHeight,
											}));
										}}
									/>
									{formData.featuredImageWidth && (
										<p className="text-xs text-gray-500 mt-1">
											{formData.featuredImageWidth} x{" "}
											{formData.featuredImageHeight}px
										</p>
									)}
								</div>
							)}
							<input
								type="text"
								value={formData.featuredImageAlt}
								onChange={(e) =>
									setFormData({ ...formData, featuredImageAlt: e.target.value })
								}
								placeholder="Texto alternativo (para SEO)"
								className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
							/>
						</div>

						{/* SEO Completo */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								Optimización SEO
							</h3>

							{/* SEO Básico */}
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Título SEO
									</label>
									<input
										type="text"
										value={formData.seoTitle}
										onChange={(e) =>
											setFormData({ ...formData, seoTitle: e.target.value })
										}
										placeholder="Título optimizado para SEO (opcional, usa el título del post por defecto)"
										maxLength={60}
										className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<div className="flex justify-between mt-1">
										<p className="text-xs text-gray-500">
											Recomendado: 50-60 caracteres
										</p>
										<p
											className={`text-xs font-medium ${
												formData.seoTitle.length >= 50 &&
												formData.seoTitle.length <= 60
													? "text-green-600"
													: formData.seoTitle.length > 60
														? "text-red-600"
														: "text-gray-500"
											}`}
										>
											{formData.seoTitle.length}/60
										</p>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Meta Description
									</label>
									<textarea
										value={formData.metaDescription}
										onChange={(e) =>
											setFormData({
												...formData,
												metaDescription: e.target.value,
											})
										}
										placeholder="Descripción breve para motores de búsqueda"
										rows={3}
										maxLength={160}
										className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<div className="flex justify-between mt-1">
										<p className="text-xs text-gray-500">
											Recomendado: 150-160 caracteres
										</p>
										<p
											className={`text-xs font-medium ${
												formData.metaDescription.length >= 150 &&
												formData.metaDescription.length <= 160
													? "text-green-600"
													: formData.metaDescription.length > 160
														? "text-red-600"
														: "text-gray-500"
											}`}
										>
											{formData.metaDescription.length}/160
										</p>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Palabras Clave (SEO Keywords)
									</label>
									<input
										type="text"
										value={formData.seoKeywords}
										onChange={(e) =>
											setFormData({ ...formData, seoKeywords: e.target.value })
										}
										placeholder="Separadas por comas: abogado, derecho laboral, indemnización"
										maxLength={255}
										className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<p className="text-xs text-gray-500 mt-1">
										5-10 palabras clave relevantes
									</p>
								</div>
							</div>

							{/* Open Graph */}
							<div className="mt-6 pt-6 border-t">
								<h4 className="text-sm font-semibold text-gray-900 mb-3">
									Open Graph (Facebook, LinkedIn)
								</h4>
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											OG Título
										</label>
										<input
											type="text"
											value={formData.ogTitle}
											onChange={(e) =>
												setFormData({ ...formData, ogTitle: e.target.value })
											}
											placeholder="Título para redes sociales (opcional, usa título SEO por defecto)"
											maxLength={60}
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											OG Description
										</label>
										<textarea
											value={formData.ogDescription}
											onChange={(e) =>
												setFormData({
													...formData,
													ogDescription: e.target.value,
												})
											}
											placeholder="Descripción para redes sociales (opcional)"
											rows={2}
											maxLength={160}
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											OG Image
										</label>
										<input
											type="url"
											value={formData.ogImage}
											onChange={(e) =>
												setFormData({ ...formData, ogImage: e.target.value })
											}
											placeholder="URL imagen para redes sociales (opcional, usa imagen destacada por defecto)"
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
								</div>
							</div>

							{/* Twitter Card */}
							<div className="mt-6 pt-6 border-t">
								<h4 className="text-sm font-semibold text-gray-900 mb-3">
									Twitter Card
								</h4>
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Twitter Título
										</label>
										<input
											type="text"
											value={formData.twitterTitle}
											onChange={(e) =>
												setFormData({
													...formData,
													twitterTitle: e.target.value,
												})
											}
											placeholder="Título para Twitter (opcional, usa OG title por defecto)"
											maxLength={60}
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Twitter Description
										</label>
										<textarea
											value={formData.twitterDescription}
											onChange={(e) =>
												setFormData({
													...formData,
													twitterDescription: e.target.value,
												})
											}
											placeholder="Descripción para Twitter (opcional)"
											rows={2}
											maxLength={160}
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Twitter Image
										</label>
										<input
											type="url"
											value={formData.twitterImage}
											onChange={(e) =>
												setFormData({
													...formData,
													twitterImage: e.target.value,
												})
											}
											placeholder="URL imagen para Twitter (opcional, usa OG image por defecto)"
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Categories */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Categorías
							</label>
							<div className="space-y-2 mb-3">
								{categories.map((cat) => (
									<div
										key={cat.id}
										className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded"
									>
										<span className="text-sm text-blue-700">{cat.name}</span>
										<button
											onClick={() => handleRemoveCategory(cat.id)}
											className="text-blue-600 hover:text-blue-800"
										>
											<X className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>
							<div className="flex gap-2">
								<input
									type="text"
									value={newCategoryName}
									onChange={(e) => setNewCategoryName(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
									placeholder="Nueva categoría"
									className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<button
									onClick={handleAddCategory}
									className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
								>
									<Plus className="w-4 h-4" />
								</button>
							</div>
						</div>

						{/* Tags */}
						<div className="bg-white rounded-lg shadow-sm p-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Etiquetas
							</label>
							<div className="flex flex-wrap gap-2 mb-3">
								{tags.map((tag) => (
									<div
										key={tag.id}
										className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm"
									>
										<span>{tag.name}</span>
										<button
											onClick={() => handleRemoveTag(tag.id)}
											className="text-gray-600 hover:text-gray-800"
										>
											<X className="w-3 h-3" />
										</button>
									</div>
								))}
							</div>
							<div className="flex gap-2">
								<input
									type="text"
									value={newTagName}
									onChange={(e) => setNewTagName(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
									placeholder="Nueva etiqueta"
									className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<button
									onClick={handleAddTag}
									className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
								>
									<Plus className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
