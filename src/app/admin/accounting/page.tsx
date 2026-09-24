import CollectionsManager from "@/components/accounting/CollectionsManager";

// El encabezado (título, bajada y los botones de alta) va dentro del propio
// componente, para que la pantalla sea una sola pieza y no un título suelto
// con una tabla debajo.
export default function AccountingPage() {
	return <CollectionsManager />;
}
