"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import Button from "@/components/ui/button/Button"
import { Edit2, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, ChevronRight, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table"
import { NegotiationFilters } from "./NegotiationFilters"
import EditNegotiation from "./EditNegotiation"
import {
  NEGOTIATIONS_ENDPOINT,
  NEGOTIATION_BY_ID_ENDPOINT,
  NEGOTIATION_OFFERS_ENDPOINT,
  NEGOTIATION_ACCEPT_OFFER_ENDPOINT,
} from "@/constant/api-endpoints"
import type { Negotiation, ViewMode, NegotiationStatus } from "@/types/negotiations"
import { useRolePermissions } from "@/hooks/useRolePermissions"
import type { ColumnConfig } from "./ColumnSelector"

// ============================================================================
// Map ViewMode → NegotiationStatus
// ============================================================================
const VALID_TRANSITIONS: Record<NegotiationStatus, { value: NegotiationStatus; label: string }[]> = {
  INICIAR: [
    { value: "CURSO", label: "Pasar a En Curso" },
    { value: "PERDIDAS", label: "Marcar como Perdida" },
  ],
  CURSO: [
    { value: "SUSPENSO", label: "Suspender" },
    { value: "FINALIZADAS", label: "Finalizar" },
    { value: "PERDIDAS", label: "Marcar como Perdida" },
  ],
  SUSPENSO: [
    { value: "CURSO", label: "Reanudar (En Curso)" },
    { value: "PERDIDAS", label: "Marcar como Perdida" },
  ],
  FINALIZADAS: [],
  PERDIDAS: [],
}

const STATUS_BADGE_STYLES: Record<NegotiationStatus, string> = {
  INICIAR: "bg-blue-100 text-blue-700",
  CURSO: "bg-emerald-100 text-emerald-700",
  SUSPENSO: "bg-amber-100 text-amber-700",
  FINALIZADAS: "bg-green-100 text-green-700",
  PERDIDAS: "bg-red-100 text-red-700",
}

const VIEW_TO_STATUS: Record<ViewMode, NegotiationStatus> = {
  iniciar: "INICIAR",
  curso: "CURSO",
  suspenso: "SUSPENSO",
  finalizadas: "FINALIZADAS",
  perdidas: "PERDIDAS",
}

const STATUS_LABELS: Record<NegotiationStatus, string> = {
  INICIAR: "Iniciar",
  CURSO: "En Curso",
  SUSPENSO: "Suspenso",
  FINALIZADAS: "Finalizada",
  PERDIDAS: "Perdida",
}

interface FilterState {
  searchTerm: string
  abogadoInterno: string
  abogadoContraparte: string
  lesion: string
  estado: string
  rangoMonto: { min: string; max: string }
}

interface NegotiationsTableProps {
  viewMode: ViewMode
  columnConfig: ColumnConfig[]
  onColumnChange: (columns: ColumnConfig[]) => void
  onDataChange?: () => void
}

export function NegotiationsTable({ viewMode, columnConfig, onColumnChange, onDataChange }: NegotiationsTableProps) {
  const { data: session } = useSession()
  const permissions = useRolePermissions()
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    abogadoInterno: "",
    abogadoContraparte: "",
    lesion: "",
    estado: "",
    rangoMonto: { min: "", max: "" },
  })
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null)
  const [showPujaModal, setShowPujaModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [nuevoMonto, setNuevoMonto] = useState("")
  const [offerNotes, setOfferNotes] = useState("")
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isLawyer = permissions.isLawyer
  const userId = permissions.getUserId()

  // ─── Fetch negotiations ───
  const fetchNegotiations = useCallback(async () => {
    if (!session?.user?.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append("status", VIEW_TO_STATUS[viewMode])
      params.append("limit", "5000")

      if (isLawyer && userId) {
        params.append("lawyerId", userId.toString())
      }

      const url = `${NEGOTIATIONS_ENDPOINT}?${params.toString()}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      })

      if (!response.ok) throw new Error("Error al cargar negociaciones")

      const data = await response.json()

      // Transform API data — datos del caso vienen en `neg.case`
      const transformed: Negotiation[] = (data.data || []).map((neg: any) => ({
        id: neg.id,
        caseId: neg.caseId,
        contraparteLawyer: neg.contraparteLawyer || null,
        incLegalistas: neg.incLegalistas ? parseFloat(neg.incLegalistas) : null,
        deArt: neg.deArt ? parseFloat(neg.deArt) : null,
        liquidacion100: neg.liquidacion100 ? parseFloat(neg.liquidacion100) : null,
        liquidacion80: neg.liquidacion80 ? parseFloat(neg.liquidacion80) : null,
        lastOfferAmount: neg.lastOfferAmount ? parseFloat(neg.lastOfferAmount) : null,
        lastOfferSource: neg.lastOfferSource || null,
        agreedAmount: neg.agreedAmount ? parseFloat(neg.agreedAmount) : null,
        notes: neg.notes || null,
        status: neg.status,
        case: {
          id: neg.case?.id,
          title: neg.case?.title || null,
          number: neg.case?.number || null,
          injury: neg.case?.injury || null,
          responsibleLawyer: neg.case?.responsibleLawyer || null,
          internalLawyer: neg.case?.internalLawyer || null,
          customer: neg.case?.customer || null,
          parts: neg.case?.parts || [],
        },
        offers: (neg.offers || []).map((offer: any) => ({
          id: offer.id,
          tipo: offer.type,
          monto: parseFloat(offer.amount),
          fecha: new Date(offer.date).toLocaleDateString("es-AR"),
          aceptada: offer.accepted,
          notes: offer.notes || null,
        })),
        closingId: neg.closing?.id || null,
      }))

      setNegotiations(transformed)
    } catch (err) {
      console.error("Error fetching negotiations:", err)
      setError("Error al cargar las negociaciones")
      setNegotiations([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.accessToken, viewMode, isLawyer, userId])

  useEffect(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(fetchNegotiations, 100)
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    }
  }, [fetchNegotiations])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null)
        setShowStatusSubmenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ─── Filters & sort ───
  const filteredNegotiations = useMemo(() => {
    const filtered = negotiations.filter((neg) => {
      if (filters.searchTerm) {
        const s = filters.searchTerm.toLowerCase()
        const fields = [
          neg.case.title,
          neg.case.responsibleLawyer?.name,
          neg.case.internalLawyer?.name,
          neg.contraparteLawyer,
          neg.case.injury,
        ]
        if (!fields.some((f) => (f || "").toLowerCase().includes(s))) return false
      }
      if (filters.abogadoInterno && neg.case.internalLawyer?.name !== filters.abogadoInterno) return false
      if (filters.abogadoContraparte && neg.contraparteLawyer !== filters.abogadoContraparte) return false
      if (filters.lesion && neg.case.injury !== filters.lesion) return false
      if (filters.rangoMonto.min || filters.rangoMonto.max) {
        const monto = neg.lastOfferAmount || 0
        if (filters.rangoMonto.min && monto < parseFloat(filters.rangoMonto.min)) return false
        if (filters.rangoMonto.max && monto > parseFloat(filters.rangoMonto.max)) return false
      }
      return true
    })

    if (sortConfig) {
      filtered.sort((a, b) => {
        let aVal: any
        let bVal: any

        switch (sortConfig.key) {
          case "causa": aVal = a.case.title; bVal = b.case.title; break
          case "abogadoRepresentante": aVal = a.case.responsibleLawyer?.name; bVal = b.case.responsibleLawyer?.name; break
          case "abogadoInterno": aVal = a.case.internalLawyer?.name; bVal = b.case.internalLawyer?.name; break
          case "abogadoContraparte": aVal = a.contraparteLawyer; bVal = b.contraparteLawyer; break
          case "lesion": aVal = a.case.injury; bVal = b.case.injury; break
          case "incLegalistas": aVal = a.incLegalistas || 0; bVal = b.incLegalistas || 0; break
          case "deArt": aVal = a.deArt || 0; bVal = b.deArt || 0; break
          case "liquidacion100": aVal = a.liquidacion100 || 0; bVal = b.liquidacion100 || 0; break
          case "liquidacion80": aVal = a.liquidacion80 || 0; bVal = b.liquidacion80 || 0; break
          case "ultimaOferta": aVal = a.lastOfferAmount || 0; bVal = b.lastOfferAmount || 0; break
          default: return 0
        }

        const aStr = String(aVal || "").toLowerCase()
        const bStr = String(bVal || "").toLowerCase()
        if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1
        if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [negotiations, filters, sortConfig])

  const uniqueValues = useMemo(() => ({
    abogadosInternos: [...new Set(negotiations.map((n) => n.case.internalLawyer?.name).filter(Boolean))] as string[],
    abogadosContraparte: [...new Set(negotiations.map((n) => n.contraparteLawyer).filter(Boolean))] as string[],
    lesiones: [...new Set(negotiations.map((n) => n.case.injury).filter(Boolean))] as string[],
  }), [negotiations])

  // ─── Helpers ───
  const formatCurrency = (value: number | null) => {
    if (!value) return "-"
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(value)
  }

  const formatPercentage = (value: number | null) => (!value ? "-" : `${value}%`)

  const isColumnVisible = (id: string) => {
    const col = columnConfig.find((c) => c.id === id)
    return col ? col.visible : true
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key && prev.direction === "asc"
        ? { key, direction: "desc" }
        : { key, direction: "asc" }
    )
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4" />
    return sortConfig.direction === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  // ─── Actions ───
  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta negociación?")) return
    try {
      const response = await fetch(NEGOTIATION_BY_ID_ENDPOINT(id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || "Error al eliminar")
      }
      setNegotiations((prev) => prev.filter((n) => n.id !== id))
      onDataChange?.()
    } catch (err: any) {
      alert(err.message || "Error al eliminar la negociación")
    }
  }

  const handleStatusChange = async (id: number, newStatus: NegotiationStatus) => {
    if (newStatus === "FINALIZADAS") {
      if (!confirm("Esto generará un cierre automático. ¿Continuar?")) return
    }
    try {
      const response = await fetch(NEGOTIATION_BY_ID_ENDPOINT(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || "Error al actualizar estado")
      }
      await fetchNegotiations()
      onDataChange?.()
    } catch (err: any) {
      alert(err.message || "Error al actualizar el estado")
    }
  }

  const handleAddOffer = async (tipo: "ASEGURADORA" | "LEGALISTAS") => {
    if (!selectedNegotiation || !nuevoMonto) {
      alert("Por favor complete el monto")
      return
    }
    try {
      const response = await fetch(NEGOTIATION_OFFERS_ENDPOINT(selectedNegotiation.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
        body: JSON.stringify({ type: tipo, amount: parseFloat(nuevoMonto), notes: offerNotes || null }),
      })
      if (!response.ok) throw new Error("Error al crear la oferta")

      setNuevoMonto("")
      setOfferNotes("")
      await fetchNegotiations()
      onDataChange?.()

      // Refresh selected negotiation
      const updated = negotiations.find((n) => n.id === selectedNegotiation.id)
      if (updated) {
        // Re-fetch the single negotiation for modal
        const detailRes = await fetch(NEGOTIATION_BY_ID_ENDPOINT(selectedNegotiation.id), {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
        })
        if (detailRes.ok) {
          const detail = await detailRes.json()
          const neg = detail.data
          setSelectedNegotiation({
            ...selectedNegotiation,
            lastOfferAmount: neg.lastOfferAmount ? parseFloat(neg.lastOfferAmount) : null,
            lastOfferSource: neg.lastOfferSource,
            offers: (neg.offers || []).map((o: any) => ({
              id: o.id,
              tipo: o.type,
              monto: parseFloat(o.amount),
              fecha: new Date(o.date).toLocaleDateString("es-AR"),
              aceptada: o.accepted,
              notes: o.notes || null,
            })),
          })
        }
      }
    } catch (err) {
      alert("Error al agregar la oferta")
    }
  }

  const handleAcceptOffer = async (offerId: number) => {
    if (!selectedNegotiation) return
    if (!confirm("¿Aceptar esta oferta? Esto finalizará la negociación y generará un cierre automático.")) return

    try {
      const response = await fetch(NEGOTIATION_ACCEPT_OFFER_ENDPOINT(selectedNegotiation.id, offerId), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || "Error al aceptar")
      }
      setShowPujaModal(false)
      setSelectedNegotiation(null)
      await fetchNegotiations()
      onDataChange?.()
      alert("Oferta aceptada. Negociación finalizada y cierre creado.")
    } catch (err: any) {
      alert(err.message || "Error al aceptar la oferta")
    }
  }

  const handleEditSuccess = async () => {
    setShowEditModal(false)
    setSelectedNegotiation(null)
    await fetchNegotiations()
    onDataChange?.()
  }

  // ─── Loading / Error / Empty states ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-sm text-gray-500">Cargando negociaciones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error-200 bg-error-50 p-6">
        <p className="text-sm text-error-800">{error}</p>
      </div>
    )
  }

  if (filteredNegotiations.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay negociaciones</h3>
        <p className="mt-1 text-sm text-gray-500">
          No hay negociaciones en estado &quot;{STATUS_LABELS[VIEW_TO_STATUS[viewMode]]}&quot;
        </p>
      </div>
    )
  }

  // ─── Column header helper ───
  const ColHeader = ({ id, label }: { id: string; label: string }) =>
    isColumnVisible(id) ? (
      <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
        <button onClick={() => handleSort(id)} className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors">
          {label}
          {getSortIcon(id)}
        </button>
      </TableCell>
    ) : null

  return (
    <>
      <NegotiationFilters
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters({ searchTerm: "", abogadoInterno: "", abogadoContraparte: "", lesion: "", estado: "", rangoMonto: { min: "", max: "" } })}
        totalResults={negotiations.length}
        filteredResults={filteredNegotiations.length}
        uniqueValues={uniqueValues}
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <ColHeader id="causa" label="Causa" />
                <ColHeader id="abogadoRepresentante" label="Abogado Representante" />
                <ColHeader id="abogadoInterno" label="Abogado Interno" />
                <ColHeader id="abogadoContraparte" label="Abogado Contraparte" />
                <ColHeader id="lesion" label="Lesión" />
                <ColHeader id="incLegalistas" label="% Legalistas" />
                <ColHeader id="deArt" label="% PMO" />
                <ColHeader id="liquidacion100" label="Liquidación 100%" />
                <ColHeader id="liquidacion80" label="Liquidación 80%" />
                <ColHeader id="ultimaOferta" label="Última Oferta" />
                <TableCell isHeader className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Acción
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNegotiations.map((neg) => (
                <TableRow key={neg.id} className="hover:bg-gray-50">
                  {isColumnVisible("causa") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{neg.case.title || `Causa #${neg.caseId}`}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_STYLES[neg.status]}`}>
                          {STATUS_LABELS[neg.status]}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("abogadoRepresentante") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                      {neg.case.responsibleLawyer?.name || "-"}
                    </TableCell>
                  )}
                  {isColumnVisible("abogadoInterno") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                      {neg.case.internalLawyer?.name || "-"}
                    </TableCell>
                  )}
                  {isColumnVisible("abogadoContraparte") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                      {neg.contraparteLawyer || "-"}
                    </TableCell>
                  )}
                  {isColumnVisible("lesion") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                      {neg.case.injury || <span className="text-gray-400 italic">Sin lesión</span>}
                    </TableCell>
                  )}
                  {isColumnVisible("incLegalistas") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                      {formatPercentage(neg.incLegalistas)}
                    </TableCell>
                  )}
                  {isColumnVisible("deArt") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                      {formatPercentage(neg.deArt)}
                    </TableCell>
                  )}
                  {isColumnVisible("liquidacion100") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                      {formatCurrency(neg.liquidacion100)}
                    </TableCell>
                  )}
                  {isColumnVisible("liquidacion80") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                      {formatCurrency(neg.liquidacion80)}
                    </TableCell>
                  )}
                  {isColumnVisible("ultimaOferta") && (
                    <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                      {neg.lastOfferAmount ? (
                        <div className="flex flex-col items-end">
                          <span className="font-medium">{formatCurrency(neg.lastOfferAmount)}</span>
                          <span className="text-xs text-gray-500">
                            {neg.lastOfferSource === "art" ? "ART" : "LEGALISTAS"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 text-right">
                    <div className="relative inline-block" ref={openDropdownId === neg.id ? dropdownRef : undefined}>
                      <button
                        onClick={() => {
                          setOpenDropdownId(openDropdownId === neg.id ? null : neg.id)
                          setShowStatusSubmenu(false)
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-[#09A4B5] transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {openDropdownId === neg.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-1 animate-in fade-in-0 zoom-in-95">
                          {/* Ver Ofertas */}
                          <button
                            onClick={() => {
                              setSelectedNegotiation(neg)
                              setShowPujaModal(true)
                              setOpenDropdownId(null)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#09A4B5] transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Ofertas
                          </button>

                          {/* Editar */}
                          {neg.status !== "FINALIZADAS" && neg.status !== "PERDIDAS" && (
                            <button
                              onClick={() => {
                                setSelectedNegotiation(neg)
                                setShowEditModal(true)
                                setOpenDropdownId(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#09A4B5] transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                              Editar
                            </button>
                          )}

                          {/* Cambiar Estado - submenu */}
                          {VALID_TRANSITIONS[neg.status].length > 0 && (
                            <div className="relative">
                              <button
                                onClick={() => setShowStatusSubmenu(!showStatusSubmenu)}
                                className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#09A4B5] transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <ChevronRight className={`h-4 w-4 transition-transform ${showStatusSubmenu ? "rotate-90" : ""}`} />
                                  Cambiar Estado
                                </span>
                              </button>
                              {showStatusSubmenu && (
                                <div className="border-t border-gray-100 bg-gray-50/50">
                                  {VALID_TRANSITIONS[neg.status].map((transition) => (
                                    <button
                                      key={transition.value}
                                      onClick={() => {
                                        setOpenDropdownId(null)
                                        setShowStatusSubmenu(false)
                                        handleStatusChange(neg.id, transition.value)
                                      }}
                                      className={`flex w-full items-center gap-2 pl-9 pr-3 py-2 text-sm transition-colors ${
                                        transition.value === "FINALIZADAS"
                                          ? "text-green-700 hover:bg-green-50"
                                          : transition.value === "PERDIDAS"
                                          ? "text-red-600 hover:bg-red-50"
                                          : "text-gray-700 hover:bg-gray-100"
                                      }`}
                                    >
                                      {transition.value === "FINALIZADAS" && <AlertTriangle className="h-3.5 w-3.5" />}
                                      {transition.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Eliminar - solo INICIAR */}
                          {neg.status === "INICIAR" && (
                            <>
                              <div className="my-1 border-t border-gray-100" />
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null)
                                  handleDelete(neg.id)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── Modal Historial de Ofertas ─── */}
      <Dialog open={showPujaModal} onOpenChange={setShowPujaModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Ofertas</DialogTitle>
          </DialogHeader>
          {selectedNegotiation && (
            <div className="space-y-4">
              {/* Header sincronizado desde Case */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">{selectedNegotiation.case.title || `Causa #${selectedNegotiation.caseId}`}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Abogado Representante:</span>{" "}
                    <span className="font-medium">{selectedNegotiation.case.responsibleLawyer?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Abogado Interno:</span>{" "}
                    <span className="font-medium">{selectedNegotiation.case.internalLawyer?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Abogado Contraparte:</span>{" "}
                    <span className="font-medium">{selectedNegotiation.contraparteLawyer || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lesión:</span>{" "}
                    <span className="font-medium">{selectedNegotiation.case.injury || "Sin registrar"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">% Legalistas:</span>{" "}
                    <span className="font-medium">{formatPercentage(selectedNegotiation.incLegalistas)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">% PMO:</span>{" "}
                    <span className="font-medium">{formatPercentage(selectedNegotiation.deArt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Liquidación 100%:</span>{" "}
                    <span className="font-medium">{formatCurrency(selectedNegotiation.liquidacion100)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Liquidación 80%:</span>{" "}
                    <span className="font-medium">{formatCurrency(selectedNegotiation.liquidacion80)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Última Oferta:</span>{" "}
                    <span className="font-medium">
                      {selectedNegotiation.lastOfferAmount
                        ? `${formatCurrency(selectedNegotiation.lastOfferAmount)} (${selectedNegotiation.lastOfferSource === "art" ? "ART" : "LEGALISTAS"})`
                        : "Sin ofertas"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ofertas */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Historial de Ofertas</h4>
                <div className="space-y-2">
                  {selectedNegotiation.offers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No hay ofertas registradas aún</p>
                  ) : (
                    selectedNegotiation.offers.map((oferta) => (
                      <div
                        key={oferta.id}
                        className={`p-3 rounded-lg border ${oferta.tipo === "ASEGURADORA"
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-[#09A4B5]/5 border-[#09A4B5]/30"
                        } ${oferta.aceptada ? "ring-2 ring-[#09A4B5]" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-1 text-[10px] rounded-full text-white bg-[#09A4B5]">
                                {oferta.tipo === "ASEGURADORA" ? "ART" : "LEGALISTAS"}
                              </span>
                              {oferta.aceptada && (
                                <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                                  ACEPTADA
                                </span>
                              )}
                            </div>
                            <p className="text-lg font-bold mt-1 text-gray-900">{formatCurrency(oferta.monto)}</p>
                            <p className="text-[10px] text-muted-foreground">{oferta.fecha}</p>
                            {oferta.notes && <p className="text-xs text-gray-500 mt-1">{oferta.notes}</p>}
                          </div>
                          {!oferta.aceptada && selectedNegotiation.status !== "FINALIZADAS" && selectedNegotiation.status !== "PERDIDAS" && (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 border-0 px-3 font-medium"
                              onClick={() => handleAcceptOffer(oferta.id)}
                            >
                              Aceptar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Agregar oferta — solo si no está finalizada/perdida */}
              {selectedNegotiation.status !== "FINALIZADAS" && selectedNegotiation.status !== "PERDIDAS" && (
                <div className="border border-gray-200 bg-gradient-to-br from-[#09A4B5]/5 to-cyan-50/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3 text-[#09A4B5]">Agregar Nueva Oferta</h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Monto de la oferta"
                        value={nuevoMonto}
                        onChange={(e) => setNuevoMonto(e.target.value)}
                        className="flex-1 h-9 px-3 rounded-md border border-gray-300 bg-white text-sm focus:border-[#09A4B5] focus:ring-1 focus:ring-[#09A4B5] outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Notas (opcional)"
                      value={offerNotes}
                      onChange={(e) => setOfferNotes(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white text-sm focus:border-[#09A4B5] focus:ring-1 focus:ring-[#09A4B5] outline-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm"
                        onClick={() => handleAddOffer("ASEGURADORA")}
                      >
                        Agregar Oferta ART
                      </Button>
                      <Button
                        className="flex-1 bg-[#09A4B5] hover:bg-[#09A4B5]/85 text-white border-none shadow-sm"
                        onClick={() => handleAddOffer("LEGALISTAS")}
                      >
                        Agregar Oferta Legalistas
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Edit Modal ─── */}
      {selectedNegotiation && (
        <EditNegotiation
          negotiation={selectedNegotiation}
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedNegotiation(null) }}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
