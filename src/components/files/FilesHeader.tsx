import { ArrowLeft, ChevronLeft, Download, Edit, Printer, Share2 } from "lucide-react";
import Button from "../ui/button/Button";
import Badge from "../ui/badge/Badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getFileTypeLabel, getProceduralStageLabel, getProcessTypeLabel, getStatusProcessLabel } from "@/lib/functions";
import { CasesFiles } from "@/types/cases";
import { useState } from "react";
import { NewFileModal } from "../case-details/NewFileModal";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

interface FilesHeaderProps {
    file?: CasesFiles
}

export default function FilesHeader({ file }: FilesHeaderProps) {
    const router = useRouter()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const handleEdit = () => {
        setIsEditModalOpen(true)
    }

    const handleBack = () => {
        router.push(`/admin/legal-cases/${file?.caseId}`)
    }
    return (
        <header className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center">
                    <Button variant="outline" size="sm" className="mr-4 flex-shrink-0" onClick={handleBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="grid grid-cols-1 gap-2">
                            <h1 className="text-xl font-bold text-gray-900 break-words max-w-full sm:max-w-2xl 2xl:max-w-none">
                                {file?.case?.customer?.name} 
                                {file && Array.isArray(file.filesParts) && file.filesParts.length > 0 && file.filesParts[0]?.name ? `C/${file.filesParts[0].name}` : ""} 
                                S/ {getProcessTypeLabel(typeof file?.typeProcessId === 'number' ? file.typeProcessId : null)}.
                            </h1>
                            {/* 
                            <Badge className="ml-0 bg-blue-100 text-blue-600 font-medium rounded-full px-4 py-2 text-xs whitespace-pre-line !leading-[1.1]">
                                {getProceduralStageLabel(file?.proceduralStageId ?? 0, file?.filetype ?? 0)}
                            </Badge>
                            */}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            <span className="font-medium">
                                {file?.cuij}
                            </span> • {file?.filetype !== undefined ? getFileTypeLabel(file.filetype) : "Tipo desconocido"} • {getStatusProcessLabel(file?.statusProcessId ?? 0)} • {file?.court?.charter}
                        </p>
                    </div>
                </div>

                {/* Desktop buttons (solo >= 1441px) */}
                <div className="hidden 2xl:flex items-center space-x-2">
                    {/* <Button variant="outline" size="sm">
                        <Printer className="h-4 w-4" />
                        Imprimir
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                        Descargar
                    </Button>
                    <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4" />
                        Compartir
                    </Button> */}
                    <Button size="sm" onClick={handleEdit}>
                        <Edit className="h-4 w-4" />
                        Editar
                    </Button>
                </div>

                {/* Dropdown para <= 1440px */}
                <div className="flex 2xl:hidden items-center space-x-2 relative">
                    <Button size="sm" onClick={handleEdit} variant="custom" className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80 hover:text-gray-dark p-2">
                        <Edit className="h-4 w-4" />
                        Editar
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setDropdownOpen((v) => !v)}
                        className="dropdown-toggle flex items-center justify-center"
                        variant="outline"
                        aria-label="Más acciones"
                    >
                        <ChevronLeft className="h-5 w-5 rotate-90" />
                    </Button>
                    <Dropdown isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)}>
                        <DropdownItem onClick={() => {/* lógica imprimir */ setDropdownOpen(false)}}>
                            <Printer className="h-4 w-4 inline mr-2" /> Imprimir
                        </DropdownItem>
                        <DropdownItem onClick={() => {/* lógica descargar */ setDropdownOpen(false)}}>
                            <Download className="h-4 w-4 inline mr-2" /> Descargar
                        </DropdownItem>
                        <DropdownItem onClick={() => {/* lógica compartir */ setDropdownOpen(false)}}>
                            <Share2 className="h-4 w-4 inline mr-2" /> Compartir
                        </DropdownItem>
                    </Dropdown>
                </div>
            </div>

            {isEditModalOpen && (
                <NewFileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={() => setIsEditModalOpen(false)}
                    initialFileType={file?.filetype || 1}
                    caseId={Number(file?.caseId)}
                    fileToEdit={file}
                    isEditMode={true}
                />
            )}
        </header>
    )
}