import CasesContent from "@/components/cases/CasesContent"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gestor de Casos Legales | Legalistas Admin",
  description: "Administra y gestiona todos los casos legales de tus clientes",
}

export default function CasesPage() {
  return <CasesContent />
}

