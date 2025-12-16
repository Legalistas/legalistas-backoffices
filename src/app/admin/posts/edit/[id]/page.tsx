'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Editor } from '@tinymce/tinymce-react'
import { Save, ArrowLeft, X, Plus } from 'lucide-react'
import { POST_BY_ID_ENDPOINT } from '@/constant/api-endpoints'
import Image from 'next/image'

export default function EditPostPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const postId = parseInt(params.id as string)
  const editorRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    contentHtml: '',
    status: 'draft',
    featuredImageUrl: '',
    featuredImageAlt: '',
    featuredImageWidth: null as number | null,
    featuredImageHeight: null as number | null,
    // SEO
    seoTitle: '',
    metaDescription: '',
    seoKeywords: '',
    // Open Graph
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    // Twitter Card
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
  })

  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string }>>([])
  const [tags, setTags] = useState<Array<{ id: number; name: string; slug: string }>>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPost()
  }, [postId])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const response = await fetch(POST_BY_ID_ENDPOINT(postId), {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session?.user?.accessToken}`,
        },
      })

      if (response.ok) {
        const post = await response.json()
        setFormData({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          contentHtml: post.contentHtml,
          status: post.status,
          featuredImageUrl: post.featuredImageUrl || '',
          featuredImageAlt: post.featuredImageAlt || '',
          featuredImageWidth: post.featuredImageWidth || null,
          featuredImageHeight: post.featuredImageHeight || null,
          // SEO
          seoTitle: post.seoTitle || '',
          metaDescription: post.metaDescription || '',
          seoKeywords: post.seoKeywords || '',
          // Open Graph
          ogTitle: post.ogTitle || '',
          ogDescription: post.ogDescription || '',
          ogImage: post.ogImage || '',
          // Twitter Card
          twitterTitle: post.twitterTitle || '',
          twitterDescription: post.twitterDescription || '',
          twitterImage: post.twitterImage || '',
        })
        setCategories(post.categories || [])
        setTags(post.tags || [])
      } else {
        alert('Error al cargar el post')
        router.push('/admin/posts')
      }
    } catch (error) {
      console.error('Error fetching post:', error)
      alert('Error al cargar el post')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-')
    const newCategory = {
      id: Date.now(),
      name: newCategoryName,
      slug,
    }
    setCategories([...categories, newCategory])
    setNewCategoryName('')
  }

  const handleRemoveCategory = (id: number) => {
    setCategories(categories.filter((c) => c.id !== id))
  }

  const handleAddTag = () => {
    if (!newTagName.trim()) return
    const slug = newTagName.toLowerCase().replace(/\s+/g, '-')
    const newTag = {
      id: Date.now(),
      name: newTagName,
      slug,
    }
    setTags([...tags, newTag])
    setNewTagName('')
  }

  const handleRemoveTag = (id: number) => {
    setTags(tags.filter((t) => t.id !== id))
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)

      const content = editorRef.current ? editorRef.current.getContent() : formData.contentHtml

      if (!formData.title || !formData.slug || !content) {
        alert('Por favor completa los campos requeridos')
        setSaving(false)
        return
      }

      const postData = {
        ...formData,
        contentHtml: content,
        categories,
        tags,
        featuredImageWidth: formData.featuredImageWidth,
        featuredImageHeight: formData.featuredImageHeight,
      }

      const response = await fetch(POST_BY_ID_ENDPOINT(postId), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(postData),
      })

      if (response.ok) {
        alert('Post actualizado exitosamente')
        router.push('/admin/posts')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'No se pudo actualizar el post'}`)
      }
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Error al actualizar el post')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500"></div>
          <p className="mt-4 text-gray-600">Cargando post...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/posts')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Editar Post</h1>
                <p className="text-sm text-gray-600">{formData.title}</p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 text-2xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Slug */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">/blog/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Extracto</label>
              <Editor
                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                value={formData.excerpt}
                onEditorChange={(content) => setFormData({ ...formData, excerpt: content })}
                init={{
                  height: 200,
                  menubar: false,
                  language: 'es',
                  plugins: ['link', 'lists', 'paste'],
                  toolbar: 'bold italic | bullist numlist | link | removeformat',
                  content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px }',
                  paste_as_text: true,
                }}
              />
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Contenido *</label>
              <Editor
                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                onInit={(evt, editor) => (editorRef.current = editor)}
                initialValue={formData.contentHtml}
                init={{
                  height: 600,
                  menubar: true,
                  language: 'es',
                  plugins: [
                    'advlist',
                    'autolink',
                    'lists',
                    'link',
                    'image',
                    'charmap',
                    'preview',
                    'anchor',
                    'searchreplace',
                    'visualblocks',
                    'code',
                    'fullscreen',
                    'insertdatetime',
                    'media',
                    'table',
                    'help',
                    'wordcount',
                  ],
                  toolbar:
                    'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | removeformat | code | help',
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, featuredImageUrl: e.target.value })}
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
                      const img = e.target as HTMLImageElement
                      setFormData(prev => ({
                        ...prev,
                        featuredImageWidth: img.naturalWidth,
                        featuredImageHeight: img.naturalHeight
                      }))
                    }}
                  />
                  {formData.featuredImageWidth && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.featuredImageWidth} x {formData.featuredImageHeight}px
                    </p>
                  )}
                </div>
              )}
              <input
                type="text"
                value={formData.featuredImageAlt}
                onChange={(e) => setFormData({ ...formData, featuredImageAlt: e.target.value })}
                placeholder="Texto alternativo (para SEO)"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
              />
            </div>

            {/* SEO Completo */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimización SEO</h3>
              
              {/* SEO Básico */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título SEO
                  </label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                    placeholder="Título optimizado para SEO (opcional, usa el título del post por defecto)"
                    maxLength={60}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">Recomendado: 50-60 caracteres</p>
                    <p className={`text-xs font-medium ${
                      formData.seoTitle.length >= 50 && formData.seoTitle.length <= 60
                        ? 'text-green-600' : formData.seoTitle.length > 60 ? 'text-red-600' : 'text-gray-500'
                    }`}>
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
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    placeholder="Descripción breve para motores de búsqueda"
                    rows={3}
                    maxLength={160}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">Recomendado: 150-160 caracteres</p>
                    <p className={`text-xs font-medium ${
                      formData.metaDescription.length >= 150 && formData.metaDescription.length <= 160
                        ? 'text-green-600' : formData.metaDescription.length > 160 ? 'text-red-600' : 'text-gray-500'
                    }`}>
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
                    onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                    placeholder="Separadas por comas: abogado, derecho laboral, indemnización"
                    maxLength={255}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">5-10 palabras clave relevantes</p>
                </div>
              </div>

              {/* Open Graph */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Open Graph (Facebook, LinkedIn)</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Título</label>
                    <input
                      type="text"
                      value={formData.ogTitle}
                      onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                      placeholder="Título para redes sociales (opcional, usa título SEO por defecto)"
                      maxLength={60}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Description</label>
                    <textarea
                      value={formData.ogDescription}
                      onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                      placeholder="Descripción para redes sociales (opcional)"
                      rows={2}
                      maxLength={160}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Image</label>
                    <input
                      type="url"
                      value={formData.ogImage}
                      onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                      placeholder="URL imagen para redes sociales (opcional, usa imagen destacada por defecto)"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Twitter Card */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Twitter Card</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Título</label>
                    <input
                      type="text"
                      value={formData.twitterTitle}
                      onChange={(e) => setFormData({ ...formData, twitterTitle: e.target.value })}
                      placeholder="Título para Twitter (opcional, usa OG title por defecto)"
                      maxLength={60}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Description</label>
                    <textarea
                      value={formData.twitterDescription}
                      onChange={(e) => setFormData({ ...formData, twitterDescription: e.target.value })}
                      placeholder="Descripción para Twitter (opcional)"
                      rows={2}
                      maxLength={160}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Image</label>
                    <input
                      type="url"
                      value={formData.twitterImage}
                      onChange={(e) => setFormData({ ...formData, twitterImage: e.target.value })}
                      placeholder="URL imagen para Twitter (opcional, usa OG image por defecto)"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Categorías</label>
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
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Etiquetas</label>
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
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
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
  )
}
