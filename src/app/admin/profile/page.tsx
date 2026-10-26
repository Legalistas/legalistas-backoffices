import type { Metadata } from "next";
import { Suspense } from "react";
import ProfileContent from "@/components/profile/ProfileContent";

export const metadata: Metadata = {
	title: "Configuración | Legalistas Admin",
	description: "Seguridad de tu cuenta y cuentas vinculadas",
};

export default function ProfilePage() {
	// ProfileContent reads ?tab= with useSearchParams, which needs a Suspense boundary.
	return (
		<Suspense>
			<ProfileContent />
		</Suspense>
	);
}
