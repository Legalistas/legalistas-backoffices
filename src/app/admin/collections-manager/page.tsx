import type { Metadata } from "next";
import CollectionsManager from "@/components/collections/CollectionsManager";

export const metadata: Metadata = {
	title: "Gestor de Gastos e Ingresos | Legalistas Admin",
	description: "Controlá cobros, pagos y vencimientos",
};

export default function CollectionsManagerPage() {
	return <CollectionsManager />;
}
