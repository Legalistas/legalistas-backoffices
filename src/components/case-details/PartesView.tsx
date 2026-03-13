"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { User, Building2, Plus, Users, Pencil, Trash2, MapPin, Phone, Mail, Loader2, FileText, X, ChevronDown, Search } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Modal } from "@/components/ui/modal/Modal"
import Button from "@/components/ui/button/Button"
import { CASE_PARTS_ENDPOINT, CASE_PART_BY_ID_ENDPOINT, SETTINGS_COUNTRIES_ENDPOINT } from "@/constant/api-endpoints"
import { PARTS_TYPES, TYPES_PROCCESS } from "@/constant/causes"
import type { CasePart, CasesFiles } from "@/types/cases"

const PERSON_TYPE_OPTIONS = [
    { value: "fisica", label: "Persona Física" },
    { value: "juridica", label: "Persona Jurídica" },
]

const DOCUMENT_TYPE_OPTIONS = [
    { value: "DNI", label: "DNI" },
    { value: "CUIT", label: "CUIT" },
    { value: "CUIL", label: "CUIL" },
    { value: "CDI", label: "CDI" },
    { value: "pasaporte", label: "Pasaporte" },
    { value: "otro", label: "Otro" },
]

const partyTypeColors: Record<string, string> = {
    actor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
    demandado: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    coactor: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
    codemandado: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
    tercero: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
    tercero_citado: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
    citado_eviccion: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800",
    citado_codemanda: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
    aseguradora: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
    art: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
    heredero: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800",
    legatario: "bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800",
    acreedor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800",
    sindico: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    ministerio_publico: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
    asesor_menores: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800",
}

const getFileLabel = (f: any, customerName?: string): string => {
    const parts = f.parts || []
    const actor = parts.find((p: any) => p.partyType === "actor" || p.partyType === "demandante")
    const demandado = parts.find((p: any) => p.partyType === "demandado")
    const actorName = actor?.name || customerName || ""
    const demandadoName = demandado?.name || (actorName ? "Sin partes" : "")
    const partesLabel = actorName ? `${actorName} C/ ${demandadoName}` : ""
    const processType = f.typeProcessId ? TYPES_PROCCESS.find((t: any) => t.id === f.typeProcessId)?.value : ""
    const caratula = partesLabel ? `${partesLabel}${processType ? ` S/ ${processType}` : ""}` : f.title || `Expediente #${f.id}`
    return `${caratula}${f.cuij ? ` — ${f.cuij}` : ""}`
}

interface Country {
    id: number
    name: string
    states?: State[]
}

interface State {
    id: number
    name: string
}

const EMPTY_FORM = {
    fileId: "" as string | number,
    partyType: "actor",
    name: "",
    personType: "fisica",
    documentType: "DNI",
    documentNumber: "",
    countryId: "" as string | number,
    stateId: "" as string | number,
    city: "",
    postalCode: "",
    address: "",
    phone: "",
    email: "",
    sponsoringLawyer: "",
}

interface PartesViewProps {
    caseId: string
    files?: CasesFiles[]
    customerName?: string
}

export const PartesView = ({ caseId, files = [], customerName }: PartesViewProps) => {
    const { data: session } = useSession()
    const [parts, setParts] = useState<CasePart[]>([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingPartId, setEditingPartId] = useState<number | null>(null)
    const [form, setForm] = useState(EMPTY_FORM)

    // Countries / States
    const [countries, setCountries] = useState<Country[]>([])
    const [states, setStates] = useState<State[]>([])
    const [isCountryOpen, setIsCountryOpen] = useState(false)
    const [isStateOpen, setIsStateOpen] = useState(false)
    const countryRef = useRef<HTMLDivElement>(null)
    const stateRef = useRef<HTMLDivElement>(null)

    // ── Dropdowns state ──
    const [isFileOpen, setIsFileOpen] = useState(false)
    const [fileSearch, setFileSearch] = useState("")
    const fileRef = useRef<HTMLDivElement>(null)
    const fileSearchRef = useRef<HTMLInputElement>(null)
    const [isPartyTypeOpen, setIsPartyTypeOpen] = useState(false)
    const [isPersonTypeOpen, setIsPersonTypeOpen] = useState(false)
    const [isDocTypeOpen, setIsDocTypeOpen] = useState(false)
    const partyTypeRef = useRef<HTMLDivElement>(null)
    const personTypeRef = useRef<HTMLDivElement>(null)
    const docTypeRef = useRef<HTMLDivElement>(null)

    // Cerrar dropdowns al click fuera
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (isFileOpen && !fileRef.current?.contains(e.target as Node)) setIsFileOpen(false)
            if (isPartyTypeOpen && !partyTypeRef.current?.contains(e.target as Node)) setIsPartyTypeOpen(false)
            if (isPersonTypeOpen && !personTypeRef.current?.contains(e.target as Node)) setIsPersonTypeOpen(false)
            if (isDocTypeOpen && !docTypeRef.current?.contains(e.target as Node)) setIsDocTypeOpen(false)
            if (isCountryOpen && !countryRef.current?.contains(e.target as Node)) setIsCountryOpen(false)
            if (isStateOpen && !stateRef.current?.contains(e.target as Node)) setIsStateOpen(false)
        }
        document.addEventListener("mousedown", handle)
        return () => document.removeEventListener("mousedown", handle)
    }, [isFileOpen, isPartyTypeOpen, isPersonTypeOpen, isDocTypeOpen, isCountryOpen, isStateOpen])

    // Auto-focus file search on open
    useEffect(() => {
        if (isFileOpen) setTimeout(() => fileSearchRef.current?.focus(), 0)
    }, [isFileOpen])

    const selectedFileLabel = useMemo(() => {
        const f = files.find((file) => String(file.id) === String(form.fileId))
        if (!f) return "Sin vincular (general del caso)"
        return getFileLabel(f, customerName)
    }, [form.fileId, files, customerName])

    const searchedFiles = useMemo(() => {
        if (!fileSearch) return files
        const q = fileSearch.toLowerCase()
        return files.filter((f) =>
            f.title?.toLowerCase().includes(q) ||
            f.cuij?.toLowerCase().includes(q) ||
            f.id.toString().includes(q)
        )
    }, [files, fileSearch])

    // Fetch countries
    const fetchCountries = useCallback(async () => {
        try {
            const res = await fetch(`${SETTINGS_COUNTRIES_ENDPOINT}`, {
                headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
            })
            if (!res.ok) return
            const data = await res.json()
            setCountries(data.data || [])
        } catch (error) {
            console.error("Error fetching countries:", error)
        }
    }, [session?.user?.accessToken])

    useEffect(() => {
        if (session?.user?.accessToken) fetchCountries()
    }, [fetchCountries, session?.user?.accessToken])

    // Update states when country changes
    useEffect(() => {
        if (form.countryId) {
            const selectedCountry = countries.find((c) => c.id === Number(form.countryId))
            setStates(selectedCountry?.states || [])
        } else {
            setStates([])
        }
    }, [form.countryId, countries])

    // ── Fetch partes ──
    const fetchParts = useCallback(async () => {
        try {
            const res = await fetch(CASE_PARTS_ENDPOINT(Number(caseId)), {
                headers: {
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            if (!res.ok) throw new Error("Error al cargar partes")
            const data = await res.json()
            setParts(data.parts || [])
        } catch (error) {
            console.error("Error fetching parts:", error)
        } finally {
            setLoading(false)
        }
    }, [caseId, session?.user?.accessToken])

    useEffect(() => {
        if (session?.user?.accessToken) {
            fetchParts()
        } else {
            setLoading(false)
        }
    }, [fetchParts, session?.user?.accessToken])

    // ── Handlers ──
    const handleOpenNew = () => {
        setForm({ ...EMPTY_FORM })
        setEditingPartId(null)
        setIsModalOpen(true)
    }

    const handleEdit = (part: CasePart) => {
        setEditingPartId(part.id)
        setForm({
            fileId: part.fileId || "",
            partyType: part.partyType || "actor",
            name: part.name || "",
            personType: part.personType || "fisica",
            documentType: part.documentType || "DNI",
            documentNumber: part.documentNumber || "",
            countryId: part.countryId || "",
            stateId: part.stateId || "",
            city: part.city || "",
            postalCode: part.postalCode || "",
            address: part.address || "",
            phone: part.phone || "",
            email: part.email || "",
            sponsoringLawyer: part.sponsoringLawyer || "",
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error("El nombre es obligatorio")
            return
        }

        setIsSubmitting(true)
        try {
            const isEditing = editingPartId !== null
            const url = isEditing
                ? CASE_PART_BY_ID_ENDPOINT(Number(caseId), editingPartId)
                : CASE_PARTS_ENDPOINT(Number(caseId))

            const res = await fetch(url, {
                method: isEditing ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    fileId: form.fileId ? Number(form.fileId) : null,
                    partyType: form.partyType,
                    name: form.name.trim(),
                    personType: form.personType,
                    documentType: form.documentType,
                    documentNumber: form.documentNumber || null,
                    countryId: form.countryId ? Number(form.countryId) : null,
                    stateId: form.stateId ? Number(form.stateId) : null,
                    city: form.city || null,
                    postalCode: form.postalCode || null,
                    address: form.address || null,
                    phone: form.phone || null,
                    email: form.email || null,
                    sponsoringLawyer: form.sponsoringLawyer || null,
                }),
            })

            if (!res.ok) {
                const errorData = await res.text()
                throw new Error(errorData)
            }

            toast.success(isEditing ? "Parte actualizada correctamente" : "Parte creada correctamente")
            setIsModalOpen(false)
            setEditingPartId(null)
            await fetchParts()
        } catch (error) {
            console.error("Error saving part:", error)
            toast.error(editingPartId ? "Error al actualizar la parte" : "Error al crear la parte")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (partId: number) => {
        if (!confirm("¿Estás seguro de eliminar esta parte?")) return

        try {
            const res = await fetch(CASE_PART_BY_ID_ENDPOINT(Number(caseId), partId), {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            if (!res.ok) throw new Error("Error al eliminar")
            toast.success("Parte eliminada")
            await fetchParts()
        } catch (error) {
            console.error("Error deleting part:", error)
            toast.error("Error al eliminar la parte")
        }
    }

    const getPartyTypeLabel = (code: string) =>
        PARTS_TYPES.find((t) => t.code === code)?.name || code

    // ── Loading ──
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        )
    }

    const inputClass = "w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
    const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"

    return (
        <>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-gray-400" />
                        <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">Partes del Caso</h3>
                        <span className="text-xs text-gray-400">({parts.length})</span>
                    </div>
                    <button
                        onClick={handleOpenNew}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar parte
                    </button>
                </div>

                {/* Content */}
                {parts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-5 py-14">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                            <Users className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No hay partes registradas</p>
                        <p className="text-xs text-gray-400 mb-3">Agregá las partes involucradas en el caso.</p>
                        <button
                            onClick={handleOpenNew}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-500/85 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Agregar parte
                        </button>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {parts.map((parte) => (
                            <div key={parte.id} className="rounded-lg border p-5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${parte.personType === "fisica" ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800" : "bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600"}`}>
                                            {parte.personType === "fisica" ? (
                                                <User className="h-5 w-5 text-blue-500" />
                                            ) : (
                                                <Building2 className="h-5 w-5 text-gray-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                    {parte.name}
                                                </h4>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${partyTypeColors[parte.partyType] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                                    {getPartyTypeLabel(parte.partyType)}
                                                </span>
                                            </div>

                                            {/* Document info */}
                                            {parte.documentNumber && (
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium">{parte.documentType}:</span> {parte.documentNumber}
                                                </p>
                                            )}

                                            <div className="mt-2 flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                {parte.address && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                        <span>{parte.address}{parte.city ? `, ${parte.city}` : ""}</span>
                                                    </div>
                                                )}
                                                {parte.phone && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                        <span>{parte.phone}</span>
                                                    </div>
                                                )}
                                                {parte.email && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                        <span>{parte.email}</span>
                                                    </div>
                                                )}
                                                {parte.sponsoringLawyer && (
                                                    <div className="flex items-center gap-1.5">
                                                        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                        <span>Letrado patrocinante: {parte.sponsoringLawyer}</span>
                                                    </div>
                                                )}
                                                {parte.file && (
                                                    <div className="flex items-center gap-1.5">
                                                        <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                                        <span>{getFileLabel(parte.file, customerName)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleEdit(parte)}
                                            title="Editar parte"
                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(parte.id)}
                                            title="Eliminar parte"
                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Modal Crear / Editar Parte ── */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-lg">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/10">
                            <Users className="h-5 w-5 text-brand-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editingPartId ? "Editar parte" : "Nueva parte"}</h2>
                            <p className="text-xs text-gray-500">Parte involucrada en el caso</p>
                        </div>
                    </div>

                    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                        {/* ── Sección: Vinculación ── */}
                        {files.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vinculación</h3>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <FileText className="h-3.5 w-3.5 text-gray-400" />
                                        Expediente vinculado
                                    </label>
                                    <div ref={fileRef} className="relative">
                                        <button
                                            type="button"
                                            onClick={() => { setIsFileOpen(!isFileOpen); setIsPartyTypeOpen(false); setIsPersonTypeOpen(false); setIsDocTypeOpen(false); setIsCountryOpen(false); setIsStateOpen(false) }}
                                            className="w-full flex items-center justify-between text-sm text-left bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                                        >
                                            <span className={`truncate ${form.fileId ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>{selectedFileLabel}</span>
                                            <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
                                        </button>
                                        {isFileOpen && (
                                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-44 overflow-auto">
                                                <div className="sticky top-0 bg-white dark:bg-gray-800 p-1.5 border-b border-gray-100 dark:border-gray-600">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                                        <input
                                                            ref={fileSearchRef}
                                                            type="text"
                                                            value={fileSearch}
                                                            onChange={(e) => setFileSearch(e.target.value)}
                                                            placeholder="Buscar expediente..."
                                                            className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setForm({ ...form, fileId: "" }); setIsFileOpen(false); setFileSearch("") }}
                                                    className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 ${!form.fileId ? "bg-brand-500/10 text-brand-500" : "text-gray-500"}`}
                                                >
                                                    Sin vincular (general del caso)
                                                </button>
                                                {searchedFiles.map((f) => (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        onClick={() => { setForm({ ...form, fileId: f.id }); setIsFileOpen(false); setFileSearch("") }}
                                                        className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 truncate ${String(form.fileId) === String(f.id) ? "bg-brand-500/10 text-brand-500" : "text-gray-700 dark:text-gray-200"}`}
                                                    >
                                                        {getFileLabel(f, customerName)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {files.length > 0 && <div className="border-t border-gray-100 dark:border-gray-700" />}

                        {/* ── Sección: Identificación ── */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Identificación</h3>

                            {/* Nombre */}
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <User className="h-3.5 w-3.5 text-gray-400" />
                                    Nombre <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    placeholder="Nombre completo o razón social"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            {/* Tipo de parte + Tipo de persona */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Dropdown: Tipo de parte */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Tipo de parte <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative" ref={partyTypeRef}>
                                        <button
                                            type="button"
                                            onClick={() => { setIsPartyTypeOpen(!isPartyTypeOpen); setIsPersonTypeOpen(false); setIsDocTypeOpen(false) }}
                                            className="w-full flex items-center justify-between text-sm text-left bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                                        >
                                            <span className="truncate text-gray-900 dark:text-gray-100">
                                                {PARTS_TYPES.find((t) => t.code === form.partyType)?.name || "Seleccionar"}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isPartyTypeOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {isPartyTypeOpen && (
                                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                                                <div className="max-h-52 overflow-y-auto">
                                                    {PARTS_TYPES.map((t) => (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => { setForm({ ...form, partyType: t.code }); setIsPartyTypeOpen(false) }}
                                                            className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${form.partyType === t.code ? "bg-brand-500/5 text-brand-600 font-medium" : "text-gray-900 dark:text-gray-100"}`}
                                                        >
                                                            <span className="text-sm">{t.name}</span>
                                                            <span className="block text-[11px] text-gray-400">{t.description}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dropdown: Tipo de persona */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Tipo de persona <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative" ref={personTypeRef}>
                                        <button
                                            type="button"
                                            onClick={() => { setIsPersonTypeOpen(!isPersonTypeOpen); setIsPartyTypeOpen(false); setIsDocTypeOpen(false) }}
                                            className="w-full flex items-center justify-between text-sm text-left bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                                        >
                                            <span className="truncate text-gray-900 dark:text-gray-100">
                                                {PERSON_TYPE_OPTIONS.find((o) => o.value === form.personType)?.label || "Seleccionar"}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isPersonTypeOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {isPersonTypeOpen && (
                                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                                                <div className="max-h-52 overflow-y-auto">
                                                    {PERSON_TYPE_OPTIONS.map((o) => (
                                                        <button
                                                            key={o.value}
                                                            type="button"
                                                            onClick={() => { setForm({ ...form, personType: o.value }); setIsPersonTypeOpen(false) }}
                                                            className={`w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${form.personType === o.value ? "bg-brand-500/5 text-brand-600 font-medium" : "text-gray-900 dark:text-gray-100"}`}
                                                        >
                                                            {o.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Documento */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Dropdown: Tipo de documento */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Tipo de documento <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative" ref={docTypeRef}>
                                        <button
                                            type="button"
                                            onClick={() => { setIsDocTypeOpen(!isDocTypeOpen); setIsPartyTypeOpen(false); setIsPersonTypeOpen(false) }}
                                            className="w-full flex items-center justify-between text-sm text-left bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                                        >
                                            <span className="truncate text-gray-900 dark:text-gray-100">
                                                {DOCUMENT_TYPE_OPTIONS.find((o) => o.value === form.documentType)?.label || "Seleccionar"}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isDocTypeOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {isDocTypeOpen && (
                                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                                                <div className="max-h-52 overflow-y-auto">
                                                    {DOCUMENT_TYPE_OPTIONS.map((o) => (
                                                        <button
                                                            key={o.value}
                                                            type="button"
                                                            onClick={() => { setForm({ ...form, documentType: o.value }); setIsDocTypeOpen(false) }}
                                                            className={`w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${form.documentType === o.value ? "bg-brand-500/5 text-brand-600 font-medium" : "text-gray-900 dark:text-gray-100"}`}
                                                        >
                                                            {o.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Nro. de documento
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="Ej: 30-12345678-9"
                                        value={form.documentNumber}
                                        onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Separador */}
                        <div className="border-t border-gray-100 dark:border-gray-700" />

                        {/* ── Sección: Domicilio ── */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Domicilio</h3>

                            {/* País + Provincia */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Dropdown: País */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        País
                                    </label>
                                    <div className="relative" ref={countryRef}>
                                        <button
                                            type="button"
                                            onClick={() => { setIsCountryOpen(!isCountryOpen); setIsStateOpen(false); setIsPartyTypeOpen(false); setIsPersonTypeOpen(false); setIsDocTypeOpen(false) }}
                                            className="w-full flex items-center justify-between text-sm text-left bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                                        >
                                            <span className={`truncate ${!form.countryId ? "text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
                                                {form.countryId ? countries.find((c) => c.id === Number(form.countryId))?.name || "Seleccionar" : "Seleccionar país"}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isCountryOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {isCountryOpen && (
                                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                                                <div className="max-h-52 overflow-y-auto">
                                                    {countries.map((c) => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => { setForm({ ...form, countryId: c.id, stateId: "" }); setIsCountryOpen(false) }}
                                                            className={`w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${Number(form.countryId) === c.id ? "bg-brand-500/5 text-brand-600 font-medium" : "text-gray-900 dark:text-gray-100"}`}
                                                        >
                                                            {c.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dropdown: Provincia/Estado */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Provincia
                                    </label>
                                    <div className="relative" ref={stateRef}>
                                        <button
                                            type="button"
                                            onClick={() => { if (states.length > 0) { setIsStateOpen(!isStateOpen); setIsCountryOpen(false); setIsPartyTypeOpen(false); setIsPersonTypeOpen(false); setIsDocTypeOpen(false) } }}
                                            disabled={states.length === 0}
                                            className="w-full flex items-center justify-between text-sm text-left bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className={`truncate ${!form.stateId ? "text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
                                                {form.stateId ? states.find((s) => s.id === Number(form.stateId))?.name || "Seleccionar" : states.length === 0 ? "Seleccioná un país" : "Seleccionar provincia"}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isStateOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {isStateOpen && (
                                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                                                <div className="max-h-52 overflow-y-auto">
                                                    {states.map((s) => (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => { setForm({ ...form, stateId: s.id }); setIsStateOpen(false) }}
                                                            className={`w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${Number(form.stateId) === s.id ? "bg-brand-500/5 text-brand-600 font-medium" : "text-gray-900 dark:text-gray-100"}`}
                                                        >
                                                            {s.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Ciudad + Código Postal */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Ciudad
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="Ciudad"
                                        value={form.city}
                                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Código Postal
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="Ej: 1425"
                                        value={form.postalCode}
                                        onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Domicilio */}
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    placeholder="Calle, número, piso, depto"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Separador */}
                        <div className="border-t border-gray-100 dark:border-gray-700" />

                        {/* ── Sección: Contacto ── */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contacto</h3>

                            {/* Teléfono + Email */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="+54 9 11 ..."
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        className={inputClass}
                                        placeholder="email@ejemplo.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Separador */}
                        <div className="border-t border-gray-100 dark:border-gray-700" />

                        {/* ── Sección: Representación legal ── */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Representación legal</h3>
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                                    Letrado patrocinante
                                </label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    placeholder="Nombre del letrado patrocinante"
                                    value={form.sponsoringLawyer}
                                    onChange={(e) => setForm({ ...form, sponsoringLawyer: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-500/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingPartId ? "Guardar cambios" : "Agregar parte"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}
