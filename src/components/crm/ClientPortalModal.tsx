"use client"
import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { 
    Loader2, 
    X, 
    Send, 
    FileText, 
    CheckCircle, 
    Shield, 
    MessageCircle,
    ExternalLink,
    Copy,
    Check,
    Calendar,
    AlertCircle
} from "lucide-react"
import { API_BASE_URL } from "@/constant/api-endpoints"
import { toast } from "sonner"
import type { Lead } from "@/types/crm"
import Button from "@/components/ui/button/Button"

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || "https://legalistas.ar"

interface ClientPortalModalProps {
    isOpen: boolean
    onClose: () => void
    lead: Lead
    onLeadUpdate: (updatedLead: Lead) => void
}

interface PortalStatus {
    hasPortalAccess: boolean
    hasServiceAcceptance: boolean
    hasCertificate: boolean
    serviceAcceptanceStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
    portalUrl?: string
    acceptanceUrl?: string
    certificateUrl?: string
}

const CLAIM_TYPES = [
    { id: 'accidente_laboral', name: 'Accidente Laboral' },
    { id: 'enfermedad_profesional', name: 'Enfermedad Profesional' },
    { id: 'accidente_transito', name: 'Accidente de Tránsito' },
    { id: 'otro', name: 'Otro' }
]

export default function ClientPortalModal({ isOpen, onClose, lead, onLeadUpdate }: ClientPortalModalProps) {
    const { data: session } = useSession()
    const modalRef = useRef<HTMLDivElement>(null)
    
    const [activeTab, setActiveTab] = useState<'status' | 'create'>('status')
    const [isLoading, setIsLoading] = useState(false)
    const [portalStatus, setPortalStatus] = useState<PortalStatus | null>(null)
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
    
    // Form state for creating service acceptance
    const [accidentDate, setAccidentDate] = useState<string>('')
    const [claimType, setClaimType] = useState<string>('accidente_laboral')
    const [description, setDescription] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Handle click outside to close modal
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen, onClose])

    // Fetch portal status when modal opens
    useEffect(() => {
        if (isOpen && lead.id) {
            fetchPortalStatus()
        }
    }, [isOpen, lead.id])

    const fetchPortalStatus = async () => {
        setIsLoading(true)
        try {
            // Obtener estado del portal desde client-portal API
            const response = await fetch(`${API_BASE_URL}/client-portal/lead/${lead.id}/status`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setPortalStatus(data)
            } else {
                // If endpoint doesn't exist yet, assume no portal
                setPortalStatus({
                    hasPortalAccess: false,
                    hasServiceAcceptance: false,
                    hasCertificate: false
                })
            }
        } catch (error) {
            console.error("Error fetching portal status:", error)
            setPortalStatus({
                hasPortalAccess: false,
                hasServiceAcceptance: false,
                hasCertificate: false
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateServiceAcceptance = async () => {
        if (!lead.user?.name && !lead.name) {
            toast.error("El lead debe tener un cliente asociado o un nombre")
            return
        }

        setIsSubmitting(true)

        try {
            // Usar la ruta del client-portal API
            const response = await fetch(`${API_BASE_URL}/client-portal/service-acceptance`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    leadId: lead.id,
                    clientName: lead.user?.name || lead.name || 'Cliente',
                    accidentDate: accidentDate || null,
                    claimType,
                    description,
                    expiresInDays: 7
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Error al crear el formulario")
            }

            const data = await response.json()
            
            toast.success("Formulario de aceptación creado")
            
            // Refresh portal status
            await fetchPortalStatus()
            setActiveTab('status')
            
            // Copy URL to clipboard
            if (data.acceptanceUrl) {
                await navigator.clipboard.writeText(data.acceptanceUrl)
                toast.success("URL copiada al portapapeles")
            }

        } catch (error) {
            console.error("Error creating service acceptance:", error)
            toast.error((error as Error).message || "Error al crear el formulario")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCopyUrl = async (url: string, type: string) => {
        try {
            await navigator.clipboard.writeText(url)
            setCopiedUrl(type)
            toast.success("URL copiada al portapapeles")
            setTimeout(() => setCopiedUrl(null), 2000)
        } catch (error) {
            toast.error("Error al copiar la URL")
        }
    }

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Pendiente</span>
            case 'ACCEPTED':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Aceptado</span>
            case 'REJECTED':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Rechazado</span>
            case 'EXPIRED':
                return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Expirado</span>
            default:
                return null
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">Portal de Cliente</h2>
                        <p className="text-indigo-100 text-sm">{lead.user?.name || 'Sin nombre'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('status')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'status'
                                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        Estado del Portal
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'create'
                                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        Crear Formulario
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : activeTab === 'status' ? (
                        <div className="space-y-4">
                            {/* Service Acceptance Status */}
                            <div className={`p-4 rounded-lg border ${
                                portalStatus?.hasServiceAcceptance 
                                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
                                    : 'border-gray-200 bg-gray-50 dark:bg-gray-700/50'
                            }`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${
                                            portalStatus?.hasServiceAcceptance 
                                                ? 'bg-green-100 dark:bg-green-800' 
                                                : 'bg-gray-200 dark:bg-gray-600'
                                        }`}>
                                            <FileText className={`h-5 w-5 ${
                                                portalStatus?.hasServiceAcceptance 
                                                    ? 'text-green-600' 
                                                    : 'text-gray-500'
                                            }`} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                Aceptación de Servicios
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {portalStatus?.hasServiceAcceptance 
                                                    ? 'Formulario enviado' 
                                                    : 'No se ha enviado formulario'}
                                            </p>
                                            {portalStatus?.serviceAcceptanceStatus && (
                                                <div className="mt-1">
                                                    {getStatusBadge(portalStatus.serviceAcceptanceStatus)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {portalStatus?.acceptanceUrl && (
                                        <button
                                            onClick={() => handleCopyUrl(portalStatus.acceptanceUrl!, 'acceptance')}
                                            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                                            title="Copiar URL"
                                        >
                                            {copiedUrl === 'acceptance' ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Portal Access Status */}
                            <div className={`p-4 rounded-lg border ${
                                portalStatus?.hasPortalAccess 
                                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
                                    : 'border-gray-200 bg-gray-50 dark:bg-gray-700/50'
                            }`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${
                                            portalStatus?.hasPortalAccess 
                                                ? 'bg-green-100 dark:bg-green-800' 
                                                : 'bg-gray-200 dark:bg-gray-600'
                                        }`}>
                                            <ExternalLink className={`h-5 w-5 ${
                                                portalStatus?.hasPortalAccess 
                                                    ? 'text-green-600' 
                                                    : 'text-gray-500'
                                            }`} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                Portal de Acceso
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {portalStatus?.hasPortalAccess 
                                                    ? 'Cliente tiene acceso al portal' 
                                                    : 'Se crea al aceptar servicios'}
                                            </p>
                                        </div>
                                    </div>
                                    {portalStatus?.portalUrl && (
                                        <button
                                            onClick={() => handleCopyUrl(portalStatus.portalUrl!, 'portal')}
                                            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                                            title="Copiar URL"
                                        >
                                            {copiedUrl === 'portal' ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Certificate Status */}
                            <div className={`p-4 rounded-lg border ${
                                portalStatus?.hasCertificate 
                                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
                                    : 'border-gray-200 bg-gray-50 dark:bg-gray-700/50'
                            }`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${
                                            portalStatus?.hasCertificate 
                                                ? 'bg-green-100 dark:bg-green-800' 
                                                : 'bg-gray-200 dark:bg-gray-600'
                                        }`}>
                                            <Shield className={`h-5 w-5 ${
                                                portalStatus?.hasCertificate 
                                                    ? 'text-green-600' 
                                                    : 'text-gray-500'
                                            }`} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                Certificado Digital
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {portalStatus?.hasCertificate 
                                                    ? 'Certificado generado' 
                                                    : 'Se genera al aceptar servicios'}
                                            </p>
                                        </div>
                                    </div>
                                    {portalStatus?.certificateUrl && (
                                        <button
                                            onClick={() => handleCopyUrl(portalStatus.certificateUrl!, 'certificate')}
                                            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                                            title="Copiar URL"
                                        >
                                            {copiedUrl === 'certificate' ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Info message */}
                            {!portalStatus?.hasServiceAcceptance && (
                                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                                    <div className="text-sm text-blue-700 dark:text-blue-300">
                                        <p className="font-medium">¿Cómo funciona?</p>
                                        <p className="mt-1">
                                            1. Crea un formulario de aceptación de servicios<br/>
                                            2. Envía el link al cliente (WhatsApp, Email, etc.)<br/>
                                            3. Cuando el cliente acepta, se crea automáticamente su portal con carpeta digital, checklist y certificado
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Create Form Tab */
                        <div className="space-y-4">
                            {portalStatus?.hasServiceAcceptance && portalStatus.serviceAcceptanceStatus === 'PENDING' ? (
                                <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
                                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                        <p className="font-medium">Ya existe un formulario pendiente</p>
                                        <p className="mt-1">
                                            El cliente ya tiene un formulario de aceptación pendiente. 
                                            Puede copiar la URL desde la pestaña &quot;Estado del Portal&quot;.
                                        </p>
                                    </div>
                                </div>
                            ) : portalStatus?.serviceAcceptanceStatus === 'ACCEPTED' ? (
                                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                                    <div className="text-sm text-green-700 dark:text-green-300">
                                        <p className="font-medium">El cliente ya aceptó los servicios</p>
                                        <p className="mt-1">
                                            El portal del cliente ya está activo. No es necesario crear otro formulario.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Tipo de reclamo
                                        </label>
                                        <select
                                            value={claimType}
                                            onChange={(e) => setClaimType(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        >
                                            {CLAIM_TYPES.map((type) => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <Calendar className="inline h-4 w-4 mr-1" />
                                            Fecha del accidente/evento (opcional)
                                        </label>
                                        <input
                                            type="date"
                                            value={accidentDate}
                                            onChange={(e) => setAccidentDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Descripción del caso (opcional)
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Breve descripción del accidente o situación..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>

                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200">
                                        <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                            <strong>Nota:</strong> Al crear el formulario se generará un link único 
                                            que podrás enviar al cliente por WhatsApp, Email o SMS. 
                                            Cuando el cliente acepte, se creará automáticamente su portal completo.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    {activeTab === 'create' && !portalStatus?.hasServiceAcceptance && (
                        <Button
                            onClick={handleCreateServiceAcceptance}
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Crear Formulario
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
