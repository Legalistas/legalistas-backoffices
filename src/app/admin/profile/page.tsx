import ProfileContent from "@/components/profile/ProfileContent"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Perfil | Legalistas Admin",
  description: "Administra y gestiona todos los casos legales de tus clientes",
}

export default function ProfilePage() {
  return <ProfileContent />
}