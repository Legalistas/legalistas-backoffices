import { Suspense } from "react";
import CajaPage from "@/components/caja/CajaPage";

// useSearchParams (link ?cajaId= de las notificaciones) necesita Suspense.
export default function Page() {
	return (
		<Suspense>
			<CajaPage />
		</Suspense>
	);
}
