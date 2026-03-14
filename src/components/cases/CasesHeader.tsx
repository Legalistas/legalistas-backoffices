"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, BarChart3, Sparkles } from "lucide-react";
import Button from "@/components/ui/button/Button";
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
                    <Button
                        onClick={() => setAnalistaOpen(true)}
                        variant="custom"
                        size="sm"
                        className="flex items-center gap-2 bg-white text-[#09A4B5] border border-[#09A4B5] hover:bg-[#09A4B5]/10 p-2"
                    >
                        <BarChart3 className="h-4 w-4" />
                        Analista
                        <span className="flex items-center gap-0.5 bg-[#09A4B5]/15 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-[#09A4B5]">
                            <Sparkles className="h-3 w-3" />
                            IA
                        </span>
                    </Button>
                    <Button
                        onClick={handleNewCase}
                        variant="custom"
                        size="sm"
                        className="flex items-center gap-2 bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80 hover:text-gray-dark p-2"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Nuevo Caso
                    </Button>
                </div>
            </div>
            <AnalistaPanel isOpen={analistaOpen} onClose={() => setAnalistaOpen(false)} />
        </>
    );
};
