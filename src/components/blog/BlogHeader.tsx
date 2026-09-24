"use client";

import { CloudUpload, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface BlogHeaderProps {
	title?: string;
	subtitle?: string;
}

export function BlogHeader({
	title = "Blog",
	subtitle = "Administra los posts del blog público",
}: BlogHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
					{title}
				</h1>
				<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
					{subtitle}
				</p>
			</div>
			<div className="flex items-center gap-2">
				<Link href="/admin/blog/migrate-images">
					<Button
						variant="outline"
						className="flex items-center gap-2"
						title="Traer imágenes históricas del blog a MinIO"
					>
						<CloudUpload className="h-4 w-4" />
						Migrar imágenes
					</Button>
				</Link>
				<Link href="/admin/blog/create">
					<Button
						variant="default"
						className="flex items-center gap-2 bg-primary text-white hover:bg-primary/85 px-4 py-2.5 rounded-lg shadow-sm"
					>
						<PlusCircle className="h-4 w-4" />
						Nuevo Post
					</Button>
				</Link>
			</div>
		</div>
	);
}
