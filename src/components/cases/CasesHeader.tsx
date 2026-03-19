"use client";
import { BarChart3, PlusCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Role } from "@/constant/user";
import Can from "../auth/Can";
import { AnalistaPanel } from "./AnalistaPanel";

interface CasesHeaderProps {
	title: string;
}

export const CasesHeader = ({ title }: CasesHeaderProps) => {
	const router = useRouter();
	const [analistaOpen, setAnalistaOpen] = useState(false);

	const handleNewCase = () => {
		router.push("/admin/legal-cases/new");
	};

	return (
		<>
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold tracking-tight">{title}</h1>
				<div className="flex items-center gap-2">
					<Can permission={[Role.DIRECTOR_AREA_IT, Role.DIRECTOR_GENERAL_CEO]}>
						<Button
							onClick={() => setAnalistaOpen(true)}
							variant="default"
							className="flex items-center gap-2 bg-white text-primary border border-primary hover:bg-primary/10 p-2"
						>
							<BarChart3 className="h-4 w-4" />
							Analista
							<span className="flex items-center gap-0.5 bg-primary/15 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-primary">
								<Sparkles className="h-3 w-3" />
								IA
							</span>
						</Button>
					</Can>
					<Button
						onClick={handleNewCase}
						variant="default"
						className="flex items-center gap-2 bg-primary text-white hover:bg-primary/80 hover:text-gray-dark p-2"
					>
						<PlusCircle className="h-4 w-4" />
						Nuevo Caso
					</Button>
				</div>
			</div>
			<AnalistaPanel
				isOpen={analistaOpen}
				onClose={() => setAnalistaOpen(false)}
			/>
		</>
	);
};
