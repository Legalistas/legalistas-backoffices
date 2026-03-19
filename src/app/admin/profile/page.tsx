import type { Metadata } from "next";
import ProfileContent from "@/components/profile/ProfileContent";

export const metadata: Metadata = {
	title: "Perfil | Legalistas Admin",
	description: "Administra y gestiona todos los casos legales de tus clientes",
};

export default function ProfilePage() {
	return <ProfileContent />;
}
