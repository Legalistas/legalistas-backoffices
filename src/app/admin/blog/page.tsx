import type { Metadata } from "next";
import BlogContent from "@/components/blog/BlogContent";

export const metadata: Metadata = {
	title: "Blog | Legalistas Admin",
	description: "Administra los posts del blog público de Legalistas",
};

export default function BlogPage() {
	return <BlogContent />;
}
