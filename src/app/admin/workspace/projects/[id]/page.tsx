import { Suspense } from "react";
import Board from "@/components/workspace/Board";

export const metadata = {
	title: "Tablero | Espacio de trabajo",
};

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return (
		// Board reads ?task= from the URL (useSearchParams).
		<Suspense>
			<Board projectId={Number(id)} />
		</Suspense>
	);
}
