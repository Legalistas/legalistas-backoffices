import Link from "next/link"
import { PlusCircle } from "lucide-react"
import Button from "@/components/ui/button/Button"

interface CasesHeaderProps {
    title: string
}

export const CasesHeader = ({ title }: CasesHeaderProps) => {
    return (
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <Link href="/admin/legal-cases/new">
                <Button
                    variant="custom"
                    size="sm"
                    className="flex items-center gap-2 bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80 hover:text-gray-dark p-2"
                >
                    <PlusCircle className="h-4 w-4" />
                    Nuevo Caso
                </Button>
            </Link>
        </div>
    )
}

