"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import Button from "@/components/ui/button/Button"
import { Edit2, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Building } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select/SelectComposed"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table"
import { NegotiationFilters } from "./NegotiationFilters"
import EditNegotiation from "./EditNegotiation"
import {
  NEGOTIATIONS_ENDPOINT,
  NEGOTIATION_BY_ID_ENDPOINT,
  NEGOTIATION_OFFERS_ENDPOINT,
  NEGOTIATION_ACCEPT_OFFER_ENDPOINT
} from "@/constant/api-endpoints"
import type { Oferta, Negotiation, ViewMode } from "@/types/negotiations"
import { Role } from "@/constant/user"
import { useRolePermissions, buildFilteredUrl } from "@/hooks/useRolePermissions"
import type { ColumnConfig } from "./ColumnSelector"

interface FilterState {
  searchTerm: string
  abogadoInterno: string
  abogadoContraparte: string
  lesion: string
  estado: string
  rangoMonto: {
    min: string
    max: string
  }
}

interface NegotiationsTableProps {
  viewMode: "esperando" | "en-curso" | "finalizadas"
  columnConfig: ColumnConfig[]
  onColumnChange: (columns: ColumnConfig[]) => void
}

export function NegotiationsTable({ viewMode, columnConfig, onColumnChange }: NegotiationsTableProps) {
  const { data: session } = useSession()
  const permissions = useRolePermissions()
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    abogadoInterno: "",
    abogadoContraparte: "",
    lesion: "",
    estado: "",
    rangoMonto: {
      min: "",
      max: ""
    }
  })
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Negotiation | 'ultimaOferta'
    direction: 'asc' | 'desc'
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null)
  const [showPujaModal, setShowPujaModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [nuevoMonto, setNuevoMonto] = useState("")
  const [nuevaFecha, setNuevaFecha] = useState("")

  // Memoizar los valores de permisos para evitar re-renders constantes
  const isLawyer = permissions.isLawyer;
  const userId = permissions.getUserId();
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchDataRef = useRef<() => void>(() => { });

  // Fetch negotiations from API con debounce
  useEffect(() => {
    // Función local para evitar dependencias problemáticas
    const fetchData = async () => {
      if (!session?.user?.role || !session?.user?.accessToken) return;

      setIsLoading(true)
      setError(null)
      try {
        const statusParam = viewMode === "esperando" ? "ESPERANDO" :
          viewMode === "en-curso" ? "EN_NEGOCIACION" :
            viewMode === "finalizadas" ? "FINALIZADA" : ""

        // Construir URL base
        let url = NEGOTIATIONS_ENDPOINT;
        const params = new URLSearchParams();

        if (statusParam) {
          params.append('status', statusParam);
        }
        params.append('limit', '1000000');

        // Si es abogado, agregar filtro
        if (isLawyer && userId) {
          params.append('lawyerId', userId.toString());
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        })

        if (!response.ok) throw new Error("Error al cargar negociaciones")

        const data = await response.json()

        // Transform API data to match component structure
        const transformedData: Negotiation[] = data.data.map((neg: any) => ({
          id: neg.id,
          causa: neg.title,
          expediente: neg.caseFile?.title || "",
          abogadoContraparte: neg.contraparteLawyer || "",
          abogadoInterno: neg.lawyer?.name || "",
          lesion: neg.lesion || "",
          incLegalistas: neg.incLegalistas ? parseFloat(neg.incLegalistas) : null,
          deArt: neg.deArt || null,
          liquidacion100: neg.liquidacion100 ? parseFloat(neg.liquidacion100) : null,
          liquidacion80: neg.liquidacion80 ? parseFloat(neg.liquidacion80) : null,
          ofertas: neg.offers?.map((offer: any) => ({
            tipo: offer.type,
            monto: parseFloat(offer.amount),
            fecha: new Date(offer.date).toISOString().split('T')[0],
            aceptada: offer.accepted,
          })) || [],
          estado: neg.status,
          lawyerId: neg.lawyer?.id || null,
        }))

        // Filtro adicional del lado del cliente si es necesario (para casos donde el backend no filtre correctamente)
        let filteredData = transformedData;
        if (isLawyer && userId) {
          filteredData = transformedData.filter(neg =>
            neg.lawyerId === userId ||
            neg.abogadoInterno === session.user?.name
          );
        }

        setNegotiations(filteredData)
      } catch (err) {
        console.error("Error fetching negotiations:", err)
        setError("Error al cargar las negociaciones")
        setNegotiations([])
      } finally {
        setIsLoading(false)
      }
    }

    // Guardar referencia a fetchData
    fetchDataRef.current = fetchData;

    // Limpiar timeout anterior si existe
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Ejecutar fetch con un pequeño delay para evitar llamadas múltiples
    fetchTimeoutRef.current = setTimeout(() => {
      fetchData();
    }, 100);

    // Cleanup
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [session?.user?.accessToken, session?.user?.role, session?.user?.name, viewMode, isLawyer, userId])

  // Aplicar filtros y ordenamiento
  const filteredNegotiations = useMemo(() => {
    const filtered = negotiations.filter((neg) => {
      // Filtro por estado del viewMode
      if (viewMode === "esperando" && neg.estado !== "ESPERANDO") return false
      if (viewMode === "en-curso" && neg.estado !== "EN_NEGOCIACION") return false
      if (viewMode === "finalizadas" && neg.estado !== "FINALIZADA") return false

      // Filtro de búsqueda
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        const searchFields = [
          neg.causa,
          neg.expediente,
          neg.abogadoContraparte,
          neg.abogadoInterno,
          neg.lesion
        ].map(field => (field || "").toLowerCase())

        if (!searchFields.some(field => field.includes(searchLower))) {
          return false
        }
      }

      // Filtro por abogado interno
      if (filters.abogadoInterno && neg.abogadoInterno !== filters.abogadoInterno) {
        return false
      }

      // Filtro por abogado contraparte
      if (filters.abogadoContraparte && neg.abogadoContraparte !== filters.abogadoContraparte) {
        return false
      }

      // Filtro por lesión
      if (filters.lesion && neg.lesion !== filters.lesion) {
        return false
      }

      // Filtro por rango de monto
      if (filters.rangoMonto.min || filters.rangoMonto.max) {
        const ultimaOferta = getUltimaOferta(neg)
        if (ultimaOferta) {
          const monto = ultimaOferta.monto
          if (filters.rangoMonto.min && monto < parseFloat(filters.rangoMonto.min)) {
            return false
          }
          if (filters.rangoMonto.max && monto > parseFloat(filters.rangoMonto.max)) {
            return false
          }
        }
      }

      return true
    })

    // Aplicar ordenamiento
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue: any
        let bValue: any

        if (sortConfig.key === 'ultimaOferta') {
          aValue = getUltimaOferta(a)?.monto || 0
          bValue = getUltimaOferta(b)?.monto || 0
        } else {
          aValue = a[sortConfig.key as keyof Negotiation]
          bValue = b[sortConfig.key as keyof Negotiation]
        }

        // Convertir a string para comparación segura
        aValue = String(aValue || "").toLowerCase()
        bValue = String(bValue || "").toLowerCase()

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [negotiations, viewMode, filters, sortConfig])

  // Obtener valores únicos para los filtros
  const uniqueValues = useMemo(() => {
    return {
      abogadosInternos: [...new Set(negotiations.map(neg => neg.abogadoInterno).filter(Boolean))],
      abogadosContraparte: [...new Set(negotiations.map(neg => neg.abogadoContraparte).filter(Boolean))],
      lesiones: [...new Set(negotiations.map(neg => neg.lesion).filter(Boolean))]
    }
  }, [negotiations])

  const getUltimaOferta = (neg: Negotiation) => {
    const aceptada = neg.ofertas.find((o) => o.aceptada)
    return aceptada || neg.ofertas[neg.ofertas.length - 1] || null
  }

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({
      searchTerm: "",
      abogadoInterno: "",
      abogadoContraparte: "",
      lesion: "",
      estado: "",
      rangoMonto: {
        min: "",
        max: ""
      }
    })
  }

  const handleSort = (key: keyof Negotiation | 'ultimaOferta') => {
    let direction: 'asc' | 'desc' = 'asc'

    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }

    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: keyof Negotiation | 'ultimaOferta') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4" />
    }

    return sortConfig.direction === 'asc' ?
      <ArrowUp className="w-4 h-4" /> :
      <ArrowDown className="w-4 h-4" />
  }

  const isColumnVisible = (columnId: string) => {
    const column = columnConfig.find(col => col.id === columnId)
    return column ? column.visible : true
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return "-"
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number | null) => {
    if (!value) return "-"
    return `${value}%`
  }

  const handleVerPuja = (neg: Negotiation) => {
    setSelectedNegotiation(neg)
    setShowPujaModal(true)
  }

  const handleBorrar = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta negociación?")) return

    try {
      const response = await fetch(NEGOTIATION_BY_ID_ENDPOINT(id), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      })

      if (!response.ok) throw new Error("Error al eliminar la negociación")

      // Remove from local state
      setNegotiations(negotiations.filter((n) => n.id !== id))
      alert("Negociación eliminada exitosamente")
    } catch (err) {
      console.error("Error deleting negotiation:", err)
      alert("Error al eliminar la negociación")
    }
  }

  const handleEditar = (neg: Negotiation) => {
    setSelectedNegotiation(neg)
    setShowEditModal(true)
  }

  const handleEditSuccess = async () => {
    // Refresh data after successful edit
    setShowEditModal(false)
    setSelectedNegotiation(null)
    
    // Trigger re-fetch by updating a dependency
    if (!session?.user?.accessToken) return

    try {
      const statusParam = viewMode === "esperando" ? "ESPERANDO" :
        viewMode === "en-curso" ? "EN_NEGOCIACION" :
          viewMode === "finalizadas" ? "FINALIZADA" : ""

      let url = NEGOTIATIONS_ENDPOINT;
      const params = new URLSearchParams();

      if (statusParam) {
        params.append('status', statusParam);
      }
      params.append('limit', '1000000');

      if (isLawyer && userId) {
        params.append('lawyerId', userId.toString());
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      })

      if (!response.ok) throw new Error("Error al cargar negociaciones")

      const data = await response.json()

      const transformedData: Negotiation[] = data.data.map((neg: any) => ({
        id: neg.id,
        causa: neg.title,
        expediente: neg.caseFile?.title || "",
        abogadoContraparte: neg.contraparteLawyer || "",
        abogadoInterno: neg.lawyer?.name || "",
        lesion: neg.lesion || "",
        incLegalistas: neg.incLegalistas ? parseFloat(neg.incLegalistas) : null,
        deArt: neg.deArt || null,
        liquidacion100: neg.liquidacion100 ? parseFloat(neg.liquidacion100) : null,
        liquidacion80: neg.liquidacion80 ? parseFloat(neg.liquidacion80) : null,
        ofertas: neg.offers?.map((offer: any) => ({
          tipo: offer.type,
          monto: parseFloat(offer.amount),
          fecha: new Date(offer.date).toISOString().split('T')[0],
          aceptada: offer.accepted,
        })) || [],
        estado: neg.status,
        lawyerId: neg.lawyer?.id || null,
      }))

      let filteredData = transformedData;
      if (isLawyer && userId) {
        filteredData = transformedData.filter(neg =>
          neg.lawyerId === userId ||
          neg.abogadoInterno === session.user?.name
        );
      }

      setNegotiations(filteredData)
    } catch (err) {
      console.error("Error refreshing negotiations:", err)
    }
  }

  const updateNegotiationStatus = async (id: number, status: "ESPERANDO" | "EN_NEGOCIACION" | "FINALIZADA") => {
    try {
      const response = await fetch(NEGOTIATION_BY_ID_ENDPOINT(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error("Error al actualizar la negociación")

      // Update local state
      setNegotiations(negotiations.map(n => n.id === id ? { ...n, estado: status } : n))
      alert("Estado actualizado exitosamente")
    } catch (err) {
      console.error("Error updating negotiation:", err)
      alert("Error al actualizar la negociación")
    }
  }

  const handleAgregarOferta = async (tipo: "ASEGURADORA" | "LEGALISTAS") => {
    if (!selectedNegotiation || !nuevoMonto || !nuevaFecha) {
      alert("Por favor complete todos los campos")
      return
    }

    try {
      const response = await fetch(
        NEGOTIATION_OFFERS_ENDPOINT(selectedNegotiation.id),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
          body: JSON.stringify({
            type: tipo,
            amount: Number.parseFloat(nuevoMonto),
          }),
        }
      )

      if (!response.ok) throw new Error("Error al crear la oferta")

      // Reload negotiations to get updated data
      const statusParam = viewMode === "esperando" ? "ESPERANDO" :
        viewMode === "en-curso" ? "EN_NEGOCIACION" :
          viewMode === "finalizadas" ? "FINALIZADA" : ""

      const url = statusParam
        ? `${NEGOTIATIONS_ENDPOINT}?status=${statusParam}&limit=1000`
        : `${NEGOTIATIONS_ENDPOINT}?limit=1000`

      const reloadResponse = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      })

      if (reloadResponse.ok) {
        const data = await reloadResponse.json()
        const transformedData: Negotiation[] = data.data.map((neg: any) => ({
          id: neg.id,
          causa: neg.title,
          expediente: neg.caseFile?.title || "",
          abogadoContraparte: neg.contraparteLawyer || "",
          abogadoInterno: neg.lawyer?.name || "",
          lesion: neg.lesion || "",
          incLegalistas: neg.incLegalistas ? parseFloat(neg.incLegalistas) : null,
          deArt: neg.deArt || null,
          liquidacion100: neg.liquidacion100 ? parseFloat(neg.liquidacion100) : null,
          liquidacion80: neg.liquidacion80 ? parseFloat(neg.liquidacion80) : null,
          ofertas: neg.offers?.map((offer: any) => ({
            tipo: offer.type,
            monto: parseFloat(offer.amount),
            fecha: new Date(offer.date).toISOString().split('T')[0],
            aceptada: offer.accepted,
          })) || [],
          estado: neg.status,
        }))
        setNegotiations(transformedData)

        // Update selected negotiation
        const updated = transformedData.find(n => n.id === selectedNegotiation.id)
        if (updated) setSelectedNegotiation(updated)
      }

      // Limpiar inputs
      setNuevoMonto("")
      setNuevaFecha("")
    } catch (err) {
      console.error("Error adding offer:", err)
      alert("Error al agregar la oferta")
    }
  }

  const handleAceptarOferta = async (index: number) => {
    if (!selectedNegotiation) return

    const ofertaToAccept = selectedNegotiation.ofertas[index]
    if (!ofertaToAccept) return

    // We need the offer ID from the backend, but we don't have it in the current structure
    // For now, we'll need to get it from the offers array
    // This assumes offers are in the same order as returned from API
    try {
      // First, get the full negotiation details to get offer IDs
      const detailResponse = await fetch(
        NEGOTIATION_BY_ID_ENDPOINT(selectedNegotiation.id),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        }
      )

      if (!detailResponse.ok) throw new Error("Error al obtener detalles")
      const detailData = await detailResponse.json()
      const offerId = detailData.data.offers[index]?.id

      if (!offerId) throw new Error("No se encontró el ID de la oferta")

      // Accept the offer
      const response = await fetch(
        NEGOTIATION_ACCEPT_OFFER_ENDPOINT(selectedNegotiation.id, offerId),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        }
      )

      if (!response.ok) throw new Error("Error al aceptar la oferta")

      // Reload negotiations
      const statusParam = viewMode === "esperando" ? "ESPERANDO" :
        viewMode === "en-curso" ? "EN_NEGOCIACION" :
          viewMode === "finalizadas" ? "FINALIZADA" : ""

      const url = statusParam
        ? `${NEGOTIATIONS_ENDPOINT}?status=${statusParam}&limit=1000`
        : `${NEGOTIATIONS_ENDPOINT}?limit=1000`

      const reloadResponse = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      })

      if (reloadResponse.ok) {
        const data = await reloadResponse.json()
        const transformedData: Negotiation[] = data.data.map((neg: any) => ({
          id: neg.id,
          causa: neg.title,
          expediente: neg.caseFile?.title || "",
          abogadoContraparte: neg.contraparteLawyer || "",
          abogadoInterno: neg.lawyer?.name || "",
          lesion: neg.lesion || "",
          incLegalistas: neg.incLegalistas ? parseFloat(neg.incLegalistas) : null,
          deArt: neg.deArt || null,
          liquidacion100: neg.liquidacion100 ? parseFloat(neg.liquidacion100) : null,
          liquidacion80: neg.liquidacion80 ? parseFloat(neg.liquidacion80) : null,
          ofertas: neg.offers?.map((offer: any) => ({
            tipo: offer.type,
            monto: parseFloat(offer.amount),
            fecha: new Date(offer.date).toISOString().split('T')[0],
            aceptada: offer.accepted,
          })) || [],
          estado: neg.status,
        }))
        setNegotiations(transformedData)

        // Update selected negotiation
        const updated = transformedData.find(n => n.id === selectedNegotiation.id)
        if (updated) setSelectedNegotiation(updated)
      }
    } catch (err) {
      console.error("Error accepting offer:", err)
      alert("Error al aceptar la oferta")
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-gray-500">Cargando negociaciones...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-error-200 bg-error-50 p-6">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-error-800">{error}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (filteredNegotiations.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay negociaciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            {viewMode === "esperando" && "No hay negociaciones esperando"}
            {viewMode === "en-curso" && "No hay negociaciones en curso"}
            {viewMode === "finalizadas" && "No hay negociaciones finalizadas"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <NegotiationFilters
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        totalResults={negotiations.length}
        filteredResults={filteredNegotiations.length}
        uniqueValues={uniqueValues}
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                {isColumnVisible('causa') && (
                  <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <button
                      onClick={() => handleSort('causa')}
                      className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors"
                    >
                      Causa
                      {getSortIcon('causa')}
                    </button>
                  </TableCell>
                )}
                {isColumnVisible('abogadoInterno') && (
                  <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <button
                      onClick={() => handleSort('abogadoInterno')}
                      className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors"
                    >
                      Abogado Legalistas
                      {getSortIcon('abogadoInterno')}
                    </button>
                  </TableCell>
                )}
                {isColumnVisible('abogadoContraparte') && (
                  <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <button
                      onClick={() => handleSort('abogadoContraparte')}
                      className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors"
                    >
                      Abogado Contraparte
                      {getSortIcon('abogadoContraparte')}
                    </button>
                  </TableCell>
                )}
                {isColumnVisible('lesion') && (
                  <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <button
                      onClick={() => handleSort('lesion')}
                      className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors"
                    >
                      Lesión
                      {getSortIcon('lesion')}
                    </button>
                  </TableCell>
                )}
                {isColumnVisible('incLegalistas') && (
                  <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <button
                      onClick={() => handleSort('incLegalistas')}
                      className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors"
                    >
                      % Inc Legalistas
                      {getSortIcon('incLegalistas')}
                    </button>
                  </TableCell>
                )}
                {isColumnVisible('deArt') && (
                  <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <button
                      onClick={() => handleSort('deArt')}
                      className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors"
                    >
                      % De ART
                      {getSortIcon('deArt')}
                    </button>
                  </TableCell>
                )}
                {isColumnVisible('liquidacion100') && (
                  <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <button
                      onClick={() => handleSort('liquidacion100')}
                      className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors"
                    >
                      Liquidación Legalistas - 100%
                      {getSortIcon('liquidacion100')}
                    </button>
                  </TableCell>
                )}
                {isColumnVisible('liquidacion80') && (
                  <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <button
                      onClick={() => handleSort('liquidacion80')}
                      className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors"
                    >
                      Liquidación 80%
                      {getSortIcon('liquidacion80')}
                    </button>
                  </TableCell>
                )}
                {isColumnVisible('ultimaOferta') && (
                  <TableCell isHeader className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <button
                      onClick={() => handleSort('ultimaOferta')}
                      className="flex items-center gap-2 hover:text-[#09A4B5] transition-colors"
                    >
                      Última Oferta Aceptada
                      {getSortIcon('ultimaOferta')}
                    </button>
                  </TableCell>
                )}
                <TableCell isHeader className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Acción
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNegotiations.map((neg) => {
                const ultimaOferta = getUltimaOferta(neg)

                return (
                  <TableRow key={neg.id} className="hover:bg-gray-50">
                    {isColumnVisible('causa') && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700 font-medium">
                        {neg.causa}
                      </TableCell>
                    )}
                    {isColumnVisible('abogadoInterno') && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700">
                        {neg.abogadoInterno}
                      </TableCell>
                    )}
                    {isColumnVisible('abogadoContraparte') && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700">
                        {neg.abogadoContraparte}
                      </TableCell>
                    )}
                    {isColumnVisible('lesion') && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700">
                        {neg.lesion}
                      </TableCell>
                    )}
                    {isColumnVisible('incLegalistas') && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700">
                        {formatPercentage(neg.incLegalistas)}
                      </TableCell>
                    )}
                    {isColumnVisible('deArt') && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700">
                        {formatPercentage(neg.deArt)}
                      </TableCell>
                    )}
                    {isColumnVisible('liquidacion100') && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                        {formatCurrency(neg.liquidacion100)}
                      </TableCell>
                    )}
                    {isColumnVisible('liquidacion80') && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                        {formatCurrency(neg.liquidacion80)}
                      </TableCell>
                    )}
                    {isColumnVisible('ultimaOferta') && (
                      <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                        {ultimaOferta ? (
                          <div className="flex flex-col items-end">
                            <span className="font-medium">{formatCurrency(ultimaOferta.monto)}</span>
                            <span className="text-xs text-gray-500">
                              {ultimaOferta.tipo === "ASEGURADORA" ? "ART" : "LEGALISTAS"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerPuja(neg)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-[#09A4B5] focus:outline-none focus:ring-2 focus:ring-[#09A4B5] focus:ring-offset-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver</span>
                        </button>
                        <button
                          onClick={() => handleEditar(neg)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-[#09A4B5] focus:outline-none focus:ring-2 focus:ring-[#09A4B5] focus:ring-offset-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </button>
                        <button
                          onClick={() => handleBorrar(neg.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-error-600 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showPujaModal} onOpenChange={setShowPujaModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Puja</DialogTitle>
          </DialogHeader>
          {selectedNegotiation && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">{selectedNegotiation.causa}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Expediente:</span>{" "}
                    <span className="font-medium">{selectedNegotiation.expediente}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lesión:</span>{" "}
                    <span className="font-medium">{selectedNegotiation.lesion}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">% Inc. Legalistas:</span>{" "}
                    <span className="font-medium">{formatPercentage(selectedNegotiation.incLegalistas)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">% De ART:</span>{" "}
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
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3">Historial de Ofertas y Contraofertas</h4>
                <div className="space-y-2">
                  {selectedNegotiation.ofertas.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No hay ofertas registradas aún</p>
                  ) : (
                    selectedNegotiation.ofertas.map((oferta, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${oferta.tipo === "ASEGURADORA"
                          ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-800"
                          : "bg-[#09A4B5]/5 border-[#09A4B5]/30 dark:bg-[#09A4B5]/10 dark:border-[#09A4B5]/50"
                          } ${oferta.aceptada ? "ring-2 ring-[#09A4B5] bg-[#09A4B5]/5 dark:bg-[#09A4B5]/10" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold px-2 py-1 text-[10px] rounded-full ${oferta.tipo === "ASEGURADORA"
                                  ? "text-white bg-[#09A4B5] dark:text-white dark:bg-[#09A4B5]/30"
                                  : "text-white bg-[#09A4B5] dark:text-white dark:bg-[#09A4B5]"
                                  }`}
                              >
                                {oferta.tipo === "ASEGURADORA"
                                  ? "ART"
                                  : "LEGALISTAS"}
                              </span>
                              {oferta.aceptada && (
                                <span className="text-[10px] bg-[#09A4B5] text-white px-2 py-0.5 rounded-full font-medium">
                                  ACEPTADA
                                </span>
                              )}
                            </div>
                            <p className="text-lg font-bold mt-1 text-gray-900 dark:text-gray-100">{formatCurrency(oferta.monto)}</p>
                            <p className="text-[10px] text-muted-foreground">{oferta.fecha}</p>
                          </div>
                          <div className="flex gap-2">
                            {!oferta.aceptada && (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 border-0 px-3 font-medium"
                                onClick={() => handleAceptarOferta(index)}
                              >
                                Aceptar
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-8 text-xs px-3">
                              Editar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-gray-200 bg-gradient-to-br from-[#09A4B5]/5 to-cyan-50/50 dark:from-[#09A4B5]/10 dark:to-cyan-950/20 p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-3 text-[#09A4B5] dark:text-cyan-300">Agregar Nueva Oferta</h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Monto de la oferta"
                      value={nuevoMonto}
                      onChange={(e) => setNuevoMonto(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-[#09A4B5] focus:ring-1 focus:ring-[#09A4B5] outline-none"
                    />
                    <input
                      type="date"
                      value={nuevaFecha}
                      onChange={(e) => setNuevaFecha(e.target.value)}
                      className="h-9 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-[#09A4B5] focus:ring-1 focus:ring-[#09A4B5] outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm"
                      onClick={() => handleAgregarOferta("ASEGURADORA")}
                    >
                      Agregar Oferta ART
                    </Button>
                    <Button
                      className="flex-1 bg-[#09A4B5] hover:bg-[#09A4B5]/85 text-white border-none shadow-sm"
                      onClick={() => handleAgregarOferta("LEGALISTAS")}
                    >
                      Agregar Contrapropuesta Legalistas
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Negotiation Modal */}
      {selectedNegotiation && (
        <EditNegotiation
          negotiation={selectedNegotiation}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedNegotiation(null)
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
