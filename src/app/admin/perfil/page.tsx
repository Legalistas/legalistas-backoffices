import { Suspense } from "react";
import MyProfilePage from "@/components/profile/MyProfilePage";

export default function PerfilPage() {
	// MyProfilePage reads ?section= with useSearchParams, which needs a Suspense boundary.
	return (
		<Suspense>
			<MyProfilePage />
		</Suspense>
	);
}
