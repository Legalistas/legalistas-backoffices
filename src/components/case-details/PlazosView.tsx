"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Calendar, CalendarClock, CheckCircle2, ChevronDown, Clock, Eye, EyeOff, Info, Loader2, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react"
import type { CasesFiles, CaseDeadline } from "@/types/cases"
import { getProcessTypeLabel } from "@/lib/functions"
import { Modal } from "@/components/ui/modal/Modal"
import Button from "@/components/ui/button/Button"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { CASE_DEADLINES_ENDPOINT, CASE_DEADLINE_BY_ID_ENDPOINT, SETTINGS_JURISDICTIONS_ENDPOINT, SETTINGS_DEADLINE_TYPES_ENDPOINT } from "@/constant/api-endpoints"

interface DeadlineType {
    id: number
    code: string
    name: string
    description?: string | null
    article?: string | null
    daysCount: number
    daysType: string
    extendable: boolean
    peremptory: boolean
    dilatory: boolean
    jurisdictionId: number
    order?: number | null
}

const formatDeadlineTypeLabel = (t: DeadlineType) => {
    const daysLabel = t.daysType === "business" ? "días hábiles" : "días corridos"
    return `${t.name} (${t.daysCount} ${daysLabel})`
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    pendiente: { label: "Pendiente", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
    cumplido: { label: "Cumplido", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
    vencido: { label: "Vencido", color: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle },
}

interface LawyerInfo {
    id: number
    name: string
    image?: string | null
}

interface PlazosViewProps {
    files: CasesFiles[]
    caseId: string
    responsibleLawyer?: LawyerInfo | null
    internalLawyer?: LawyerInfo | null
}

export const PlazosView = ({ files, caseId, responsibleLawyer, internalLawyer }: PlazosViewProps) => {
    const { data: session } = useSession()
    const [deadlines, setDeadlines] = useState<CaseDeadline[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<string | "all">("all")
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
    const [openStatusId, setOpenStatusId] = useState<number | null>(null)
    const statusDropdownRef = useRef<HTMLDivElement>(null)
    const [jurisdictions, setJurisdictions] = useState<{ id: number; name: string }[]>([])
    const [deadlineTypes, setDeadlineTypes] = useState<DeadlineType[]>([])

    // ── Modal ──
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    // ── Modal Ajuste de fecha ──
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
    const [adjustingDeadline, setAdjustingDeadline] = useState<CaseDeadline | null>(null)
    const [adjustForm, setAdjustForm] = useState({ newDueDate: "", reason: "" })
    const [isAdjusting, setIsAdjusting] = useState(false)

    // ── Form state ──
    const [selectedDeadlineTypeId, setSelectedDeadlineTypeId] = useState<number | null>(null)
    const [mode, setMode] = useState<"auto" | "manual">("auto")
    const [form, setForm] = useState({
        jurisdictionId: "",
        title: "",
        description: "",
        fileId: "" as string | number,
        responsibleId: "",
        notificationDate: "",
        daysCount: "",
        daysType: "business",
        dueDate: "",
        dueTime: "",
        advanceNoticeDays: "3",
        schedule: "si" as "si" | "no",
    })

    // ── Dropdown expediente ──
    const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false)
    const [fileSearch, setFileSearch] = useState("")
    const fileDropdownRef = useRef<HTMLDivElement>(null)
    const fileSearchRef = useRef<HTMLInputElement>(null)

    // ── Dropdown jurisdicción ──
    const [isJurisdictionDropdownOpen, setIsJurisdictionDropdownOpen] = useState(false)
    const [jurisdictionSearch, setJurisdictionSearch] = useState("")
    const jurisdictionDropdownRef = useRef<HTMLDivElement>(null)
    const jurisdictionSearchRef = useRef<HTMLInputElement>(null)

    // ── Dropdown tipo de plazo ──
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)
    const [typeSearch, setTypeSearch] = useState("")
    const typeDropdownRef = useRef<HTMLDivElement>(null)
    const typeSearchRef = useRef<HTMLInputElement>(null)

    const selectedFileLabel = useMemo(() => {
        const f = files.find((file) => String(file.id) === String(form.fileId))
        if (!f) return "Seleccionar expediente"
        return `Exp. #${f.id} — ${f.title || getProcessTypeLabel(f.typeProcessId)}`
    }, [form.fileId, files])

    const searchedFiles = useMemo(() => {
        if (!fileSearch) return files
        const q = fileSearch.toLowerCase()
        return files.filter((f) =>
            f.title?.toLowerCase().includes(q) ||
            f.id.toString().includes(q) ||
            getProcessTypeLabel(f.typeProcessId).toLowerCase().includes(q)
        )
    }, [files, fileSearch])

    const selectedJurisdictionLabel = useMemo(() => {
        const j = jurisdictions.find((j) => String(j.id) === String(form.jurisdictionId))
        return j ? j.name : "Seleccionar jurisdicción..."
    }, [form.jurisdictionId, jurisdictions])

    const searchedJurisdictions = useMemo(() => {
        if (!jurisdictionSearch) return jurisdictions
        const q = jurisdictionSearch.toLowerCase()
        return jurisdictions.filter((j) => j.name.toLowerCase().includes(q))
    }, [jurisdictions, jurisdictionSearch])

    const selectedTypeLabel = useMemo(() => {
        const t = deadlineTypes.find((t) => t.id === selectedDeadlineTypeId)
        return t ? formatDeadlineTypeLabel(t) : "Elegí el tipo de plazo..."
    }, [selectedDeadlineTypeId, deadlineTypes])

    const searchedTypes = useMemo(() => {
        if (!typeSearch) return deadlineTypes
        const q = typeSearch.toLowerCase()
        return deadlineTypes.filter((t: DeadlineType) => t.name.toLowerCase().includes(q))
    }, [typeSearch, deadlineTypes])

    // ── Fetch jurisdictions ──
    useEffect(() => {
        const fetchJurisdictions = async () => {
            try {
                const res = await fetch(SETTINGS_JURISDICTIONS_ENDPOINT, {
                    headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
                })
                if (res.ok) {
                    const data = await res.json()
                    setJurisdictions(data.jurisdictions || data || [])
                }
            } catch (err) {
                console.error("Error fetching jurisdictions:", err)
            }
        }
        if (session?.user?.accessToken) fetchJurisdictions()
    }, [session?.user?.accessToken])

    // ── Fetch deadline types por jurisdicción ──
    useEffect(() => {
        if (!form.jurisdictionId) {
            setDeadlineTypes([])
            return
        }
        const fetchDeadlineTypes = async () => {
            try {
                const url = `${SETTINGS_DEADLINE_TYPES_ENDPOINT}?jurisdictionId=${form.jurisdictionId}`
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
                })
                if (res.ok) {
                    const data = await res.json()
                    setDeadlineTypes(data.deadlineTypes || [])
                }
            } catch (err) {
                console.error("Error fetching deadline types:", err)
            }
        }
        if (session?.user?.accessToken) fetchDeadlineTypes()
    }, [session?.user?.accessToken, form.jurisdictionId])

    // ── Fetch deadlines ──
    const fetchDeadlines = useCallback(async () => {
        try {
            const res = await fetch(CASE_DEADLINES_ENDPOINT(Number(caseId)), {
                headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
            })
            if (!res.ok) throw new Error("Error al cargar plazos")
            const data = await res.json()
            setDeadlines(data.deadlines || [])
        } catch (error) {
            console.error("Error fetching deadlines:", error)
        } finally {
            setLoading(false)
        }
    }, [caseId, session?.user?.accessToken])

    useEffect(() => {
        if (session?.user?.accessToken) fetchDeadlines()
    }, [fetchDeadlines, session?.user?.accessToken])

    // ── Cerrar dropdown expediente al click fuera ──
    useEffect(() => {
        if (!isFileDropdownOpen) return
        const handle = (e: MouseEvent) => {
            if (fileDropdownRef.current?.contains(e.target as Node)) return
            setIsFileDropdownOpen(false)
        }
        document.addEventListener("mousedown", handle)
        return () => document.removeEventListener("mousedown", handle)
    }, [isFileDropdownOpen])

    useEffect(() => {
        if (isFileDropdownOpen) setTimeout(() => fileSearchRef.current?.focus(), 0)
    }, [isFileDropdownOpen])

    // ── Cerrar dropdown jurisdicción al click fuera ──
    useEffect(() => {
        if (!isJurisdictionDropdownOpen) return
        const handle = (e: MouseEvent) => {
            if (jurisdictionDropdownRef.current?.contains(e.target as Node)) return
            setIsJurisdictionDropdownOpen(false)
        }
        document.addEventListener("mousedown", handle)
        return () => document.removeEventListener("mousedown", handle)
    }, [isJurisdictionDropdownOpen])

    useEffect(() => {
        if (isJurisdictionDropdownOpen) setTimeout(() => jurisdictionSearchRef.current?.focus(), 0)
    }, [isJurisdictionDropdownOpen])

    // ── Cerrar dropdown tipo de plazo al click fuera ──
    useEffect(() => {
        if (!isTypeDropdownOpen) return
        const handle = (e: MouseEvent) => {
            if (typeDropdownRef.current?.contains(e.target as Node)) return
            setIsTypeDropdownOpen(false)
        }
        document.addEventListener("mousedown", handle)
        return () => document.removeEventListener("mousedown", handle)
    }, [isTypeDropdownOpen])

    useEffect(() => {
        if (isTypeDropdownOpen) setTimeout(() => typeSearchRef.current?.focus(), 0)
    }, [isTypeDropdownOpen])

    // ── Cerrar dropdown status al click fuera ──
    useEffect(() => {
        if (openStatusId === null) return
        const handle = (e: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setOpenStatusId(null)
        }
        document.addEventListener("mousedown", handle)
        return () => document.removeEventListener("mousedown", handle)
    }, [openStatusId])

    // ── Set default responsible ──
    useEffect(() => {
        if (responsibleLawyer?.id) {
            setForm((prev) => ({ ...prev, responsibleId: String(responsibleLawyer.id) }))
        }
    }, [responsibleLawyer])

    // ── Al cambiar tipo de plazo, actualizar days y daysType ──
    const handleTypeChange = (typeId: number) => {
        setSelectedDeadlineTypeId(typeId)
        const typeObj = deadlineTypes.find((t) => t.id === typeId)
        if (typeObj) {
            setForm((prev) => ({
                ...prev,
                title: typeObj.name,
                daysCount: String(typeObj.daysCount),
                daysType: typeObj.daysType || "business",
            }))
        }
    }

    // ── Filtrar y ordenar ──
    const filteredDeadlines = useMemo(() => {
        let filtered = deadlines
        if (filterStatus !== "all") {
            filtered = filtered.filter((d) => d.status === filterStatus)
        }
        return filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    }, [deadlines, filterStatus])

    // ── Calcular días restantes ──
    const getDaysLeft = (dueDate: string): number => {
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const due = new Date(dueDate)
        due.setHours(0, 0, 0, 0)
        return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    // ── Handlers ──
    const handleOpenNew = useCallback(() => {
        setSelectedDeadlineTypeId(null)
        setMode("auto")
        const firstFile = files[0]
        const jId = firstFile?.jurisdictionId || firstFile?.court?.jurisdiction?.id
        setForm({
            jurisdictionId: jId ? String(jId) : "",
            title: "",
            description: "",
            fileId: firstFile?.id || "",
            responsibleId: responsibleLawyer?.id ? String(responsibleLawyer.id) : "",
            notificationDate: "",
            daysCount: "",
            daysType: "business",
            dueDate: "",
            dueTime: "",
            advanceNoticeDays: "3",
            schedule: "si",
        })
        setEditingId(null)
        setIsModalOpen(true)
    }, [files, responsibleLawyer])

    const handleEditDeadline = (deadline: CaseDeadline) => {
        setEditingId(deadline.id)
        setSelectedDeadlineTypeId(deadline.deadlineTypeId || null)
        setMode(deadline.mode as "auto" | "manual")
        setForm({
            jurisdictionId: String(deadline.jurisdictionId),
            title: deadline.title,
            description: deadline.description || "",
            fileId: deadline.fileId || "",
            responsibleId: String(deadline.responsibleId),
            notificationDate: deadline.notificationDate ? deadline.notificationDate.split("T")[0] : "",
            daysCount: deadline.daysCount ? String(deadline.daysCount) : "",
            daysType: deadline.daysType || "business",
            dueDate: deadline.dueDate ? deadline.dueDate.split("T")[0] : "",
            dueTime: deadline.dueTime || "",
            advanceNoticeDays: String(deadline.advanceNoticeDays),
            schedule: deadline.schedule === 1 ? "si" : "no",
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.jurisdictionId) { toast.error("Seleccioná una jurisdicción"); return }
        if (!form.title) { toast.error("Ingresá un título"); return }
        if (!form.responsibleId) { toast.error("Seleccioná un responsable"); return }
        if (mode === "auto" && (!form.notificationDate || !form.daysCount)) {
            toast.error("Completá la fecha de notificación y cantidad de días"); return
        }
        if (mode === "manual" && !form.dueDate) {
            toast.error("Ingresá la fecha de vencimiento"); return
        }

        setIsSubmitting(true)
        try {
            const isEditing = editingId !== null
            const url = isEditing
                ? CASE_DEADLINE_BY_ID_ENDPOINT(Number(caseId), editingId)
                : CASE_DEADLINES_ENDPOINT(Number(caseId))

            const body = {
                jurisdictionId: Number(form.jurisdictionId),
                deadlineTypeId: selectedDeadlineTypeId || null,
                type: selectedDeadlineTypeId ? deadlineTypes.find((t) => t.id === selectedDeadlineTypeId)?.code || null : null,
                title: form.title,
                description: form.description || null,
                fileId: form.fileId ? Number(form.fileId) : null,
                responsibleId: Number(form.responsibleId),
                mode,
                ...(mode === "auto" && {
                    notificationDate: form.notificationDate,
                    daysCount: Number(form.daysCount),
                    daysType: form.daysType,
                }),
                ...(mode === "manual" && {
                    dueDate: form.dueDate,
                }),
                dueTime: form.dueTime || null,
                advanceNoticeDays: Number(form.advanceNoticeDays),
                schedule: form.schedule,
            }

            const res = await fetch(url, {
                method: isEditing ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Error al guardar")
            }

            toast.success(isEditing ? "Plazo actualizado" : "Plazo creado")
            setIsModalOpen(false)
            fetchDeadlines()
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteDeadline = async (deadlineId: number) => {
        if (!confirm("¿Eliminar este plazo?")) return
        try {
            const res = await fetch(CASE_DEADLINE_BY_ID_ENDPOINT(Number(caseId), deadlineId), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
            })
            if (!res.ok) throw new Error("Error al eliminar")
            toast.success("Plazo eliminado")
            fetchDeadlines()
        } catch (error) {
            toast.error((error as Error).message)
        }
    }

    const handleUpdateStatus = async (deadlineId: number, newStatus: string) => {
        try {
            const res = await fetch(CASE_DEADLINE_BY_ID_ENDPOINT(Number(caseId), deadlineId), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) throw new Error("Error al actualizar")
            fetchDeadlines()
        } catch (error) {
            toast.error((error as Error).message)
        }
    }

    const handleOpenAdjust = (deadline: CaseDeadline) => {
        setAdjustingDeadline(deadline)
        setAdjustForm({ newDueDate: deadline.dueDate.split("T")[0], reason: "" })
        setIsAdjustModalOpen(true)
    }

    const handleSaveAdjust = async () => {
        if (!adjustingDeadline) return
        if (!adjustForm.newDueDate) { toast.error("Seleccioná una nueva fecha"); return }
        if (adjustForm.reason.length < 10) { toast.error("El motivo debe tener al menos 10 caracteres"); return }

        setIsAdjusting(true)
        try {
            const res = await fetch(CASE_DEADLINE_BY_ID_ENDPOINT(Number(caseId), adjustingDeadline.id), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    newDueDate: adjustForm.newDueDate,
                    adjustmentReason: adjustForm.reason,
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Error al ajustar fecha")
            }
            toast.success("Fecha de vencimiento ajustada correctamente")
            setIsAdjustModalOpen(false)
            setAdjustingDeadline(null)
            fetchDeadlines()
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setIsAdjusting(false)
        }
    }

    const toggleExpanded = (id: number) => {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // ── Render ──
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        )
    }

    const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
    const inputClass = "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
    const selectClass = inputClass

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <h3 className="text-md font-semibold text-gray-900 dark:text-white">Plazos</h3>
                    {deadlines.length > 0 && (
                        <span className="text-xs text-gray-400">
                            ({deadlines.filter(d => d.status !== "cumplido").length} activos, {deadlines.filter(d => d.status === "cumplido").length} cumplidos)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {deadlines.length > 0 && (
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="appearance-none text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md pl-3 pr-7 py-2 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors cursor-pointer"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="pendiente">Pendientes</option>
                                <option value="cumplido">Cumplidos</option>
                                <option value="vencido">Vencidos</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                        </div>
                    )}
                    <button
                        onClick={handleOpenNew}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo plazo
                    </button>
                </div>
            </div>

            {/* Table */}
            {filteredDeadlines.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-14">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                        <Clock className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">No hay plazos registrados</p>
                    <p className="text-xs text-gray-400 mb-3">Creá un plazo para controlar vencimientos procesales.</p>
                    <button
                        onClick={handleOpenNew}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-500/85 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo plazo
                    </button>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    {filteredDeadlines.map((deadline) => {
                        const daysLeft = getDaysLeft(deadline.dueDate)
                        const isOverdue = deadline.status === "pendiente" && daysLeft < 0
                        const isNearDue = deadline.status === "pendiente" && daysLeft >= 0 && daysLeft <= 2
                        const isCumplido = deadline.status === "cumplido"
                        const config = STATUS_CONFIG[deadline.status] || STATUS_CONFIG.pendiente
                        const isExpanded = expandedIds.has(deadline.id)
                        const daysTypeLabel = deadline.daysType === "business" ? "días hábiles" : "días corridos"
                        const cardClass = isCumplido
                            ? "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 opacity-70"
                            : isOverdue
                                ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                                : isNearDue
                                    ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"

                        return (
                            <div key={deadline.id} className={`rounded-lg border p-5 ${cardClass}`}>
                                {/* Fila principal */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        {/* Checkbox de estado */}
                                        <input
                                            type="checkbox"
                                            checked={deadline.status === "cumplido"}
                                            onChange={() => handleUpdateStatus(deadline.id, deadline.status === "cumplido" ? "pendiente" : "cumplido")}
                                            className="mt-1.5 h-[18px] w-[18px] rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            {/* Título + badge estado */}
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className={`text-base font-semibold text-gray-900 dark:text-white ${deadline.status === "cumplido" ? "line-through opacity-60" : ""}`}>
                                                    {deadline.title}
                                                </span>
                                                <div className="relative" ref={openStatusId === deadline.id ? statusDropdownRef : undefined}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenStatusId(openStatusId === deadline.id ? null : deadline.id)}
                                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${config.color}`}
                                                    >
                                                        {config.label}
                                                        <ChevronDown className="h-3 w-3" />
                                                    </button>
                                                    {openStatusId === deadline.id && (
                                                        <div className="absolute z-50 mt-1 left-0 w-40 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                                                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                                                                const StatusIcon = cfg.icon
                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        type="button"
                                                                        onClick={() => { handleUpdateStatus(deadline.id, key); setOpenStatusId(null) }}
                                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${deadline.status === key ? "bg-gray-50 dark:bg-gray-600 font-medium" : ""}`}
                                                                    >
                                                                        <StatusIcon className={`h-4 w-4 ${key === "pendiente" ? "text-amber-500" : key === "cumplido" ? "text-green-500" : "text-red-500"}`} />
                                                                        <span className="text-gray-700 dark:text-gray-200">{cfg.label}</span>
                                                                        {deadline.status === key && <CheckCircle2 className="h-3.5 w-3.5 text-brand-500 ml-auto" />}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Info línea 1: Vencimiento + hora + días restantes */}
                                            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                                                <span className="inline-flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    Vence: {new Date(deadline.dueDate).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                                </span>
                                                {deadline.dueTime && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {deadline.dueTime}
                                                    </span>
                                                )}
                                                {deadline.status !== "cumplido" && (
                                                    <span className={`font-medium ${daysLeft < 0 ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : "text-gray-500"}`}>
                                                        {daysLeft < 0 ? `Vencido hace ${Math.abs(daysLeft)} días` : `Faltan ${daysLeft} días`}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Info línea 2: Días del plazo + jurisdicción */}
                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 dark:text-gray-500 flex-wrap">
                                                {deadline.daysCount && (
                                                    <span>{deadline.daysCount} {daysTypeLabel}</span>
                                                )}
                                                {deadline.jurisdiction && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <MapPin className="h-4 w-4" />
                                                        {deadline.jurisdiction.name}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Descripción */}
                                            {deadline.description && (
                                                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{deadline.description}</p>
                                            )}

                                            {/* Indicador de ajuste manual */}
                                            {deadline.adjustedAt && (
                                                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-2.5 py-1.5">
                                                    <CalendarClock className="h-3.5 w-3.5 text-purple-500" />
                                                    <span className="text-xs text-purple-700 dark:text-purple-300">
                                                        <span className="font-medium">Fecha ajustada</span>
                                                        {deadline.originalDueDate && (
                                                            <> — Original: {new Date(deadline.originalDueDate).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}</>
                                                        )}
                                                        {deadline.adjustmentReason && <> — {deadline.adjustmentReason}</>}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Ver más / Ocultar cálculo (solo modo auto) */}
                                            {deadline.mode === "auto" && (
                                                <button
                                                    onClick={() => toggleExpanded(deadline.id)}
                                                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-brand-500 hover:text-brand-600 font-medium"
                                                >
                                                    {isExpanded ? (
                                                        <><EyeOff className="h-4 w-4" /> Ocultar cálculo</>
                                                    ) : (
                                                        <><Eye className="h-4 w-4" /> Mostrar cálculo</>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button onClick={() => handleEditDeadline(deadline)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors" title="Editar">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleOpenAdjust(deadline)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-brand-500 transition-colors" title="Ajustar fecha">
                                            <CalendarClock className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDeleteDeadline(deadline.id)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Eliminar">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Panel expandible: detalle del cálculo */}
                                {isExpanded && deadline.mode === "auto" && (() => {
                                    const calc = deadline.calculationDetail
                                    const dateOpts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }
                                    return (
                                    <div className="mt-3 ml-7 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 p-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Info className="h-3.5 w-3.5 text-brand-500" />
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Detalle del cálculo automático</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                            <div>
                                                <span className="text-gray-400">Notificación:</span>
                                                <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                                                    {calc?.fecha_notificacion
                                                        ? new Date(calc.fecha_notificacion + "T12:00:00").toLocaleDateString("es-AR", dateOpts)
                                                        : deadline.notificationDate ? new Date(deadline.notificationDate).toLocaleDateString("es-AR", dateOpts) : "—"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Inicio cómputo:</span>
                                                <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                                                    {calc?.fecha_inicio_computo
                                                        ? new Date(calc.fecha_inicio_computo + "T12:00:00").toLocaleDateString("es-AR", dateOpts)
                                                        : "—"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Plazo:</span>
                                                <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">{deadline.daysCount} {daysTypeLabel}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Días hábiles contados:</span>
                                                <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">{calc?.dias_habiles_contados ?? deadline.daysCount}</span>
                                            </div>
                                            {deadline.dueTime && (
                                                <div>
                                                    <span className="text-gray-400">Hora de vencimiento:</span>
                                                    <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">{deadline.dueTime}hs</span>
                                                </div>
                                            )}
                                            {deadline.deadlineType?.article && (
                                                <div>
                                                    <span className="text-gray-400">Artículo:</span>
                                                    <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">{deadline.deadlineType.article}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Días excluidos del cómputo */}
                                        {calc && (calc.fines_semana_excluidos > 0 || calc.feriados_excluidos.length > 0) && (
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 underline mb-1">Días excluidos del cómputo:</p>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                                    {calc.fines_semana_excluidos > 0 && (
                                                        <p className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {calc.fines_semana_excluidos} fines de semana
                                                        </p>
                                                    )}
                                                    {calc.feriados_excluidos.length > 0 && (
                                                        <div>
                                                            <p className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {calc.feriados_excluidos.length} feriado{calc.feriados_excluidos.length > 1 ? "s" : ""}:
                                                            </p>
                                                            <ul className="ml-4 text-[11px] text-gray-400">
                                                                {calc.feriados_excluidos.map((f) => (
                                                                    <li key={f.fecha}>
                                                                        {new Date(f.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} - {f.descripcion}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Prórroga por día inhábil */}
                                        {calc?.prorrogado_por_inhabil && calc.fecha_original_vencimiento && (
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                                                    <p className="text-xs text-amber-800 dark:text-amber-300">
                                                        <span className="font-semibold">Prórroga por día inhábil</span><br />
                                                        El plazo vencía originalmente el {new Date(calc.fecha_original_vencimiento + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} (día inhábil). Se prorrogó al siguiente día hábil{deadline.deadlineType?.article ? ` conforme ${deadline.deadlineType.article}` : ""}.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-[11px] text-gray-400">
                                            Calculado: {calc?.calculado_at
                                                ? new Date(calc.calculado_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                                                : new Date(deadline.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                                        </div>
                                    </div>
                                    )
                                })()}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Modal Nuevo/Editar Plazo ── */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-xl">
                <div className="p-6">
                    {/* Header con icono */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/10">
                            <Clock className="h-5 w-5 text-brand-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingId ? "Editar plazo" : "Nuevo plazo procesal"}
                            </h2>
                            <p className="text-xs text-gray-500">Configurá los detalles del plazo procesal</p>
                        </div>
                    </div>

                    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                        {/* ── Sección: Información del plazo ── */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información del plazo</h3>

                        {/* Jurisdicción */}
                        <div>
                            <label className={labelClass}>Jurisdicción <span className="text-red-500">*</span></label>
                            <div ref={jurisdictionDropdownRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsJurisdictionDropdownOpen(!isJurisdictionDropdownOpen)}
                                    className={`${inputClass} text-left flex items-center justify-between truncate`}
                                >
                                    <span className={`truncate ${form.jurisdictionId ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>{selectedJurisdictionLabel}</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
                                </button>
                                {isJurisdictionDropdownOpen && (
                                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-44 overflow-auto">
                                        <div className="sticky top-0 bg-white dark:bg-gray-700 p-1.5 border-b border-gray-100 dark:border-gray-600">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                                <input
                                                    ref={jurisdictionSearchRef}
                                                    type="text"
                                                    value={jurisdictionSearch}
                                                    onChange={(e) => setJurisdictionSearch(e.target.value)}
                                                    placeholder="Buscar jurisdicción..."
                                                    className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white outline-none"
                                                />
                                            </div>
                                        </div>
                                        {searchedJurisdictions.map((j) => (
                                            <button
                                                key={j.id}
                                                type="button"
                                                onClick={() => {
                                                    setForm({ ...form, jurisdictionId: String(j.id) })
                                                    setIsJurisdictionDropdownOpen(false)
                                                    setJurisdictionSearch("")
                                                }}
                                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 ${String(j.id) === form.jurisdictionId ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium" : "text-gray-700 dark:text-gray-200"}`}
                                            >
                                                {j.name}
                                            </button>
                                        ))}
                                        {searchedJurisdictions.length === 0 && (
                                            <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tipo de plazo - solo visible si hay jurisdicción */}
                        {form.jurisdictionId && (
                        <div>
                            <label className={labelClass}>Tipo de plazo</label>
                            <div ref={typeDropdownRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                    className={`${inputClass} text-left flex items-center justify-between truncate`}
                                >
                                    <span className={`truncate ${selectedDeadlineTypeId ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>{selectedTypeLabel}</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
                                </button>
                                {isTypeDropdownOpen && (
                                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-44 overflow-auto">
                                        <div className="sticky top-0 bg-white dark:bg-gray-700 p-1.5 border-b border-gray-100 dark:border-gray-600">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                                <input
                                                    ref={typeSearchRef}
                                                    type="text"
                                                    value={typeSearch}
                                                    onChange={(e) => setTypeSearch(e.target.value)}
                                                    placeholder="Buscar tipo de plazo..."
                                                    className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white outline-none"
                                                />
                                            </div>
                                        </div>
                                        {searchedTypes.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    handleTypeChange(t.id)
                                                    setIsTypeDropdownOpen(false)
                                                    setTypeSearch("")
                                                }}
                                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 ${t.id === selectedDeadlineTypeId ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium" : "text-gray-700 dark:text-gray-200"}`}
                                            >
                                                {formatDeadlineTypeLabel(t)}
                                            </button>
                                        ))}
                                        {searchedTypes.length === 0 && (
                                            <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Selecciona un tipo predefinido, busca o crea uno personalizado</p>
                        </div>
                        )}

                        {/* Título */}
                        <div>
                            <label className={labelClass}>Título <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="Ej: Contestar demanda"
                                className={inputClass}
                            />
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className={labelClass}>Descripción</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Detalles adicionales..."
                                rows={2}
                                className={inputClass}
                            />
                        </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700" />

                        {/* ── Sección: Vinculación y responsable ── */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vinculación y responsable</h3>

                        {/* Vincular a caso */}
                        <div>
                            <label className={labelClass}>Vincular a caso</label>
                            <div ref={fileDropdownRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsFileDropdownOpen(!isFileDropdownOpen)}
                                    className={`${inputClass} text-left flex items-center justify-between truncate`}
                                >
                                    <span className={`truncate ${form.fileId ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>{selectedFileLabel}</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
                                </button>
                                {isFileDropdownOpen && (
                                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-44 overflow-auto">
                                        <div className="sticky top-0 bg-white dark:bg-gray-700 p-1.5 border-b border-gray-100 dark:border-gray-600">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                                <input
                                                    ref={fileSearchRef}
                                                    type="text"
                                                    value={fileSearch}
                                                    onChange={(e) => setFileSearch(e.target.value)}
                                                    placeholder="Buscar..."
                                                    className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white outline-none"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setForm({ ...form, fileId: "", jurisdictionId: "" }); setIsFileDropdownOpen(false) }}
                                            className="w-full text-left px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
                                        >
                                            Sin vincular
                                        </button>
                                        {searchedFiles.map((file) => (
                                            <button
                                                key={file.id}
                                                onClick={() => { const jId = file.jurisdictionId || file.court?.jurisdiction?.id; setForm({ ...form, fileId: file.id, jurisdictionId: jId ? String(jId) : "" }); setIsFileDropdownOpen(false); setFileSearch("") }}
                                                className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-600 truncate ${String(form.fileId) === String(file.id) ? "bg-brand-500/10 text-brand-500" : "text-gray-700 dark:text-gray-200"}`}
                                            >
                                                Exp. #{file.id} — {file.title || getProcessTypeLabel(file.typeProcessId)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Responsable */}
                        {(responsibleLawyer || internalLawyer) && (
                            <div>
                                <label className={labelClass}>Responsable</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {responsibleLawyer && (
                                        <label
                                            className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-lg cursor-pointer transition-all ${form.responsibleId === String(responsibleLawyer.id)
                                                ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/20"
                                                : "border-gray-200 dark:border-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="deadline-responsible"
                                                value={responsibleLawyer.id}
                                                checked={form.responsibleId === String(responsibleLawyer.id)}
                                                onChange={(e) => setForm({ ...form, responsibleId: e.target.value })}
                                                className="sr-only"
                                            />
                                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                                                {responsibleLawyer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{responsibleLawyer.name}</p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Abogado responsable</p>
                                            </div>
                                        </label>
                                    )}
                                    {internalLawyer && internalLawyer.id !== responsibleLawyer?.id && (
                                        <label
                                            className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-lg cursor-pointer transition-all ${form.responsibleId === String(internalLawyer.id)
                                                ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/20"
                                                : "border-gray-200 dark:border-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="deadline-responsible"
                                                value={internalLawyer.id}
                                                checked={form.responsibleId === String(internalLawyer.id)}
                                                onChange={(e) => setForm({ ...form, responsibleId: e.target.value })}
                                                className="sr-only"
                                            />
                                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
                                                {internalLawyer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{internalLawyer.name}</p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Abogado interno</p>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}
                        </div>

                        {/* Modo de vencimiento - aparece al seleccionar tipo de plazo */}
                        {selectedDeadlineTypeId && (<>
                        <div className="border-t border-gray-100 dark:border-gray-700" />

                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vencimiento</h3>
                            <div>
                                <label className={labelClass}>Modo de vencimiento</label>
                                <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setMode("auto")}
                                        className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${mode === "auto" ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"}`}
                                    >
                                        Calcular automático
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode("manual")}
                                        className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${mode === "manual" ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"}`}
                                    >
                                        Fecha manual
                                    </button>
                                </div>
                            </div>

                            {/* Campos según modo */}
                            {mode === "auto" ? (
                                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 space-y-2.5">
                                    <div>
                                        <label className={labelClass}>Fecha de notificación</label>
                                        <input
                                            type="date"
                                            value={form.notificationDate}
                                            onChange={(e) => setForm({ ...form, notificationDate: e.target.value })}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className={labelClass}>Cantidad de días</label>
                                            <input
                                                type="number"
                                                value={form.daysCount}
                                                onChange={(e) => setForm({ ...form, daysCount: e.target.value })}
                                                placeholder="Ej: 10"
                                                min="1"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Tipo de días</label>
                                            <select
                                                value={form.daysType}
                                                onChange={(e) => setForm({ ...form, daysType: e.target.value })}
                                                className={selectClass}
                                            >
                                                <option value="business">Hábiles</option>
                                                <option value="calendar">Corridos</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className={labelClass}>Fecha de vencimiento</label>
                                            <input
                                                type="date"
                                                value={form.dueDate}
                                                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Hora (opcional)</label>
                                            <input
                                                type="time"
                                                value={form.dueTime}
                                                onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Días de aviso anticipado */}
                            <div>
                                <label className={labelClass}>Días de aviso anticipado</label>
                                <input
                                    type="number"
                                    value={form.advanceNoticeDays}
                                    onChange={(e) => setForm({ ...form, advanceNoticeDays: e.target.value })}
                                    min="0"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        </>)}

                        {/* ── Sección: Hora y calendario ── */}
                        <div className="border-t border-gray-100 dark:border-gray-700" />
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hora y calendario</h3>

                            {/* Hora de vencimiento */}
                            <div>
                                <label className={labelClass}>Hora de vencimiento (opcional)</label>
                                <div className="relative">
                                    <input
                                        type="time"
                                        value={form.dueTime}
                                        onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                                        className={inputClass}
                                    />
                                    <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                    Si se indica, el plazo aparecerá con hora en el calendario. Si no, será un evento de día completo.
                                </p>
                            </div>

                            {/* Agendar en calendario */}
                            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Agendar en calendario</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Se creará un evento en el calendario del responsable</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.schedule === "si"}
                                    onClick={() => setForm({ ...form, schedule: form.schedule === "si" ? "no" : "si" })}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${form.schedule === "si" ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.schedule === "si" ? "translate-x-4" : "translate-x-0"}`} />
                                </button>
                            </div>
                        </div>

                        {/* Avisos */}
                        <div className="border-t border-gray-100 dark:border-gray-700" />
                        <div className="space-y-1.5">
                            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2">
                                <p className="text-xs text-blue-800 dark:text-blue-300">
                                    <span className="font-semibold">Nota:</span> Legalistas mantiene los plazos actualizados, pero recomendamos verificar siempre con la normativa procesal vigente. Los plazos pueden modificarse por reformas legislativas.
                                </p>
                            </div>
                            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                                <p className="text-xs text-amber-800 dark:text-amber-300">
                                    <span className="font-semibold">Atención:</span> Los días pueden variar según la materia del caso (civil, laboral, penal, etc.). Verificá siempre con la normativa específica de tu materia.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="custom"
                            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                            onClick={handleSave}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Guardando...</>
                            ) : (
                                editingId ? "Guardar cambios" : "Crear plazo"
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ── Modal Ajustar Fecha de Vencimiento ── */}
            <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} className="max-w-md">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/10">
                            <CalendarClock className="h-5 w-5 text-brand-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ajustar Fecha de Vencimiento</h2>
                            <p className="text-xs text-gray-500">{adjustingDeadline?.title}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Fecha calculada actual */}
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    <span className="font-medium">Fecha {adjustingDeadline?.mode === "auto" ? "calculada automáticamente" : "actual"}:</span>{" "}
                                    {adjustingDeadline?.dueDate
                                        ? new Date(adjustingDeadline.dueDate).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
                                        : "—"}
                                </p>
                            </div>
                        </div>

                        {/* Si ya fue ajustado antes, mostrar info */}
                        {adjustingDeadline?.adjustedAt && (
                            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                                <p className="text-xs text-amber-800 dark:text-amber-300">
                                    <span className="font-semibold">Ajuste previo:</span> {adjustingDeadline.adjustmentReason}
                                    <br />
                                    <span className="text-[11px] text-amber-600">
                                        {new Date(adjustingDeadline.adjustedAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </p>
                            </div>
                        )}

                        {/* Nueva fecha */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                Nueva fecha de vencimiento <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={adjustForm.newDueDate}
                                onChange={(e) => setAdjustForm({ ...adjustForm, newDueDate: e.target.value })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                            />
                        </div>

                        {/* Motivo */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                Motivo del ajuste <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={adjustForm.reason}
                                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                placeholder="Ej: Feriado extraordinario por..., Suspensión judicial por..., Error en el cálculo debido a..."
                                rows={3}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
                            />
                            <p className="mt-0.5 text-xs text-gray-400">
                                Mínimo 10 caracteres. Este motivo quedará registrado para auditoría.
                            </p>
                        </div>

                        {/* Aviso importante */}
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 dark:text-amber-300">
                                    <span className="font-semibold">Importante:</span> El ajuste manual sobreescribe el cálculo automático. Asegurate de documentar correctamente el motivo.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button variant="outline" onClick={() => setIsAdjustModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="custom"
                            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                            onClick={handleSaveAdjust}
                            disabled={isAdjusting || adjustForm.reason.length < 10}
                        >
                            {isAdjusting ? (
                                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Guardando...</>
                            ) : (
                                "Guardar Ajuste"
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
