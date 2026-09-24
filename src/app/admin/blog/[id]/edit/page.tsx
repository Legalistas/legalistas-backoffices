"use client";

import { Terminal } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import BlogFormContent from "@/components/blog/BlogFormContent";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { POST_BY_ID_ENDPOINT } from "@/constant/api-endpoints";
import type { Post } from "@/types/blog";

export default function EditBlogPostPage() {
	const { id } = useParams<{ id: string }>();
	const { data: session } = useSession();
	const [post, setPost] = useState<Post | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!session?.user?.accessToken || !id) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(POST_BY_ID_ENDPOINT(Number(id)), {
					headers: {
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});
				if (!res.ok) throw new Error(`Error ${res.status}`);
				const data: Post = await res.json();
				if (!cancelled) setPost(data);
			} catch (err) {
				console.error("[edit post] fetch:", err);
				if (!cancelled) setError("No se pudo cargar el post");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [id, session?.user?.accessToken]);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-3">
					<Skeleton className="h-10 w-10 rounded-md" />
					<div className="space-y-2">
						<Skeleton className="h-7 w-48" />
						<Skeleton className="h-4 w-72" />
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
					<div className="space-y-4">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-9 w-1/2" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-[460px] w-full rounded-lg" />
					</div>
					<div className="space-y-4">
						<Skeleton className="h-64 w-full rounded-xl" />
						<Skeleton className="h-48 w-full rounded-xl" />
					</div>
				</div>
			</div>
		);
	}

	if (error || !post) {
		return (
			<Alert variant="destructive">
				<Terminal className="h-4 w-4" />
				<AlertTitle>Error</AlertTitle>
				<AlertDescription>
					{error || "No se encontró el post"}
				</AlertDescription>
			</Alert>
		);
	}

	return <BlogFormContent initialPost={post} />;
}
