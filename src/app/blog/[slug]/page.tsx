'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, User, Tag, ArrowLeft, Clock } from 'lucide-react'
import { POST_BY_SLUG_ENDPOINT, POST_RELATED_ENDPOINT } from '@/constant/api-endpoints'

interface Post {
  id: number
  slug: string
  title: string
  excerpt: string
  contentHtml: string
  date: string
  modified: string
  authorName: string
  featuredImageUrl: string | null
  featuredImageAlt: string | null
  categories: Array<{ id: number; name: string; slug: string }>
  tags: Array<{ id: number; name: string; slug: string }>
  yoastHeadHtml: string | null
}

export default function PostPage() {
  const params = useParams()
  const slug = params.slug as string

  const [post, setPost] = useState<Post | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (slug) {
      fetchPost()
      fetchRelatedPosts()
    }
  }, [slug])

  const fetchPost = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(POST_BY_SLUG_ENDPOINT(slug))
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Post no encontrado')
        } else {
          setError('Error al cargar el post')
        }
        return
      }

      const data = await response.json()
      setPost(data)
    } catch (err) {
      console.error('Error fetching post:', err)
      setError('Error al cargar el post')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedPosts = async () => {
    try {
      const response = await fetch(POST_RELATED_ENDPOINT(slug))
      if (response.ok) {
        const data = await response.json()
        setRelatedPosts(data)
      }
    } catch (err) {
      console.error('Error fetching related posts:', err)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const calculateReadTime = (html: string) => {
    const text = html.replace(/<[^>]*>/g, '')
    const words = text.split(/\s+/).length
    const minutes = Math.ceil(words / 200)
    return minutes
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

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {error || 'Post no encontrado'}
          </h1>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al blog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al blog
          </Link>
        </div>
      </div>

      {/* Featured Image */}
      {post.featuredImageUrl && (
        <div className="relative h-96 bg-gray-900">
          <Image
            src={post.featuredImageUrl}
            alt={post.featuredImageAlt || post.title}
            fill
            className="object-cover opacity-90"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        </div>
      )}

      <article className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Categories */}
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/blog?category=${cat.slug}`}
                  className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-8 pb-8 border-b">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span>{post.authorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{formatDate(post.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{calculateReadTime(post.contentHtml)} min de lectura</span>
            </div>
          </div>

          {/* Excerpt */}
          <div
            className="text-xl text-gray-700 mb-8 leading-relaxed italic border-l-4 border-blue-500 pl-6"
            dangerouslySetInnerHTML={{ __html: post.excerpt }}
          />

          {/* Content */}
          <div
            className="prose prose-lg max-w-none prose-headings:font-bold prose-h2:text-3xl prose-h3:text-2xl prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Etiquetas
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/blog?tag=${tag.slug}`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Posts Relacionados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relatedPosts.map((related: any) => (
                  <Link
                    key={related.id}
                    href={`/blog/${related.slug}`}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {related.featuredImageUrl && (
                      <div className="relative h-48 bg-gray-200">
                        <Image
                          src={related.featuredImageUrl}
                          alt={related.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600">
                        {related.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{related.authorName}</span>
                        <span>{formatDate(related.date)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Share / Back */}
          <div className="mt-12 pt-8 border-t flex justify-between items-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al blog
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
