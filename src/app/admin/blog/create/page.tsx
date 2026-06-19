import type { Metadata } from "next";
import BlogFormContent from "@/components/blog/BlogFormContent";

export const metadata: Metadata = {
	title: "Nuevo post | Legalistas Admin",
};

export default function CreateBlogPostPage() {
	return <BlogFormContent />;
}
