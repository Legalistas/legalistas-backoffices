"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { X, AlertTriangle, Clock, Calendar, CheckSquare, Sparkles, Send, Loader2, Copy, Check } from "lucide-react"
import { DASHBOARD_LEGAL_STATS_ENDPOINT, LEXIA_ANALYTICS_ENDPOINT } from "@/constant/api-endpoints"

interface AnalistaPanelProps {
    isOpen: boolean
    onClose: () => void
}

interface AnalistaStats {
    plazos_vencidos: number
    plazos_proximos_7d: number
    audiencias_proximas_7d: number
    tareas_pendientes: number
    casos_sin_movimiento_90d: number
}

interface ChatMessage {
    role: "user" | "assistant"
    content: string
    loading?: boolean
    funciones?: string[]
    modelo?: string
}

const SUGGESTIONS = [
    "Resumen financiero del mes",
    "Distribución de casos por materia",
    "Clientes con más casos",
    "Actividad de los últimos 7 días",
]

export const AnalistaPanel = ({ isOpen, onClose }: AnalistaPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [query, setQuery] = useState("")
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const { data: session } = useSession()
    const [stats, setStats] = useState<AnalistaStats>({
        plazos_vencidos: 0,
        plazos_proximos_7d: 0,
        audiencias_proximas_7d: 0,
        tareas_pendientes: 0,
        casos_sin_movimiento_90d: 0,
    })

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${DASHBOARD_LEGAL_STATS_ENDPOINT}?filter=all`, {
                headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
            })
            if (!res.ok) return
            const data = await res.json()
            const s = data.stats
            setStats({
                plazos_vencidos: s.pendingDeadlines7Days ?? 0,
                plazos_proximos_7d: s.pendingDeadlines7Days ?? 0,
                audiencias_proximas_7d: s.upcomingEvents7Days ?? 0,
                tareas_pendientes: s.pendingTasks ?? 0,
                casos_sin_movimiento_90d: 0,
            })
        } catch {
            // silently fail
        }
    }, [session?.user?.accessToken])

    useEffect(() => {
        if (isOpen) fetchStats()
    }, [isOpen, fetchStats])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        if (isOpen) {
            document.addEventListener("keydown", handleEscape)
            document.body.style.overflow = "hidden"
        }
        return () => {
            document.removeEventListener("keydown", handleEscape)
            document.body.style.overflow = "unset"
        }
    }, [isOpen, onClose])

    const handleSend = async () => {
        const text = query.trim()
        if (!text || isLoading) return

        const userMsg: ChatMessage = { role: "user", content: text }
        const loadingMsg: ChatMessage = { role: "assistant", content: "", loading: true }
        setMessages((prev) => [...prev, userMsg, loadingMsg])
        setQuery("")
        setIsLoading(true)

        try {
            const res = await fetch(LEXIA_ANALYTICS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({ answerd: text }),
            })

            if (!res.ok) throw new Error("Error en la consulta")

            const data = await res.json()
            const assistantMsg: ChatMessage = {
                role: "assistant",
                content: data.respuesta || "Sin respuesta",
                funciones: data.funciones_ejecutadas,
                modelo: data.metadata?.modelo,
            }
            setMessages((prev) => [...prev.slice(0, -1), assistantMsg])
        } catch {
            setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: "Error al consultar. Intentá de nuevo." },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSuggestion = (suggestion: string) => {
        setQuery(suggestion)
    }

    const hasMessages = messages.length > 0

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-[99999] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-[100000] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#09A4B5] flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white">LEXIA Analista</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Análisis inteligente de tu estudio</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                <span className="text-lg font-bold text-red-600 dark:text-red-400">{stats.plazos_vencidos}</span>
                            </div>
                            <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">Plazos vencidos</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-lg font-bold text-gray-700 dark:text-gray-200">{stats.plazos_proximos_7d}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Vencen en 7 días</p>
                        </div>
                        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">{stats.audiencias_proximas_7d}</span>
                            </div>
                            <p className="text-[11px] text-green-500 dark:text-green-400 font-medium">Audiencias 7d</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckSquare className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-lg font-bold text-gray-700 dark:text-gray-200">{stats.tareas_pendientes}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Tareas pendientes</p>
                        </div>
                    </div>

                    {/* Empty state OR Messages */}
                    {!hasMessages ? (
                        <>
                            <div className="flex flex-col items-center text-center mt-6 mb-8">
                                <div className="h-12 w-12 rounded-full bg-[#09A4B5]/10 flex items-center justify-center mb-4">
                                    <Sparkles className="h-6 w-6 text-[#09A4B5]" />
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Preguntá lo que quieras</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[260px]">
                                    Consultá sobre tus casos, plazos, finanzas, audiencias y más. Todos los datos son reales de tu estudio.
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Sugerencias</p>
                                <div className="space-y-1.5">
                                    {SUGGESTIONS.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => handleSuggestion(suggestion)}
                                            className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-gray-300 dark:text-gray-600">&gt;</span>
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    {msg.role === "user" ? (
                                        <div className="max-w-[80%] bg-[#09A4B5] text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm">
                                            {msg.content}
                                        </div>
                                    ) : msg.loading ? (
                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md">
                                            <Loader2 className="h-4 w-4 text-[#09A4B5] animate-spin" />
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Analizando datos...</span>
                                        </div>
                                    ) : (
                                        <div className="max-w-[85%] space-y-2">
                                            <div
                                                className="bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-gray-800 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_strong]:text-gray-900 dark:[&_strong]:text-white"
                                                dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                                            />
                                            {msg.funciones && msg.funciones.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1.5 px-1">
                                                    {msg.funciones.map((fn, j) => (
                                                        <span key={j} className="inline-flex items-center gap-1 text-[11px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-md font-medium">
                                                            {fn}
                                                        </span>
                                                    ))}
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(msg.content)}
                                                        className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                        title="Copiar respuesta"
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                        Copiar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Ej: Cuántos casos tengo por materia?"
                            disabled={isLoading}
                            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#09A4B5]/30 focus:border-[#09A4B5] disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!query.trim() || isLoading}
                            className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">Los datos provienen directamente de tu estudio</p>
                </div>
            </div>
        </>
    )
}

function formatMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br/>")
}
