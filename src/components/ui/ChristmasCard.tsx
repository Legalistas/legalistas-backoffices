"use client"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import Button from "./button/Button"

export default function ChristmasCard() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Verificar si ya se cerró el popup
        const christmasCardClosed = document.cookie
            .split("; ")
            .find(row => row.startsWith("christmas_card_closed="))
            ?.split("=")[1]

        if (!christmasCardClosed) {
            // Mostrar después de 2 segundos
            setTimeout(() => {
                setIsVisible(true)
            }, 2000)
        }
    }, [])

    const handleClose = () => {
        // Guardar en cookie que se cerró (expira en 7 días)
        const expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() + 7)
        document.cookie = `christmas_card_closed=true; expires=${expirationDate.toUTCString()}; path=/`
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative max-w-md w-full mx-4">
                {/* Botón cerrar */}
                <button
                    onClick={handleClose}
                    className="absolute -top-2 -right-2 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* Tarjeta navideña */}
                <div className="bg-gradient-to-br from-red-600 via-red-700 to-green-700 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Decoración superior */}
                    <div className="h-2 bg-gradient-to-r from-yellow-300 via-red-400 to-green-400 hidden"></div>
                    
                    {/* Contenido */}
                    <div className="p-8 text-center text-white">
                        {/* Emojis decorativos */}
                        <div className="text-6xl mb-4 animate-bounce">
                            🎄✨
                        </div>

                        {/* Título */}
                        <h2 className="text-3xl font-bold mb-6 drop-shadow-lg">
                            ¡Felices Fiestas!
                        </h2>

                        {/* Mensaje */}
                        <div className="text-base mb-6 leading-relaxed space-y-4">
                            <p>
                                En esta Navidad queremos agradecerles por el esfuerzo, la paciencia y el trabajo en equipo a lo largo del año. Sabemos que hubo desafíos, pero cada uno nos dejó aprendizajes y nos hizo más fuertes.
                            </p>

                            <p>
                                Que estas fiestas nos encuentren unidos, renovando energías y con la esperanza de que, más allá de las adversidades, juntos siempre salimos adelante.
                            </p>

                            <p className="font-semibold">
                                Les deseamos una Navidad llena de paz, unión y buenos momentos junto a sus seres queridos.
                            </p>
                        </div>

                        {/* Decoración de copos de nieve */}
                        <div className="flex justify-center gap-3 text-3xl mb-6">
                            <span className="animate-pulse">❄️</span>
                            <span className="animate-pulse delay-100">⛄</span>
                            <span className="animate-pulse delay-200">❄️</span>
                        </div>

                        {/* Botón */}
                        <Button
                            onClick={handleClose}
                            className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 font-bold px-10 py-4 text-lg shadow-xl border-4 border-yellow-400 transform hover:scale-105 transition-all duration-200"
                        >
                            ¡Gracias! 🎁
                        </Button>

                        {/* Firma */}
                        <p className="mt-6 text-base font-medium">
                            Equipo de Sistema 🎄✨
                        </p>
                    </div>

                    {/* Decoración inferior */}
                    <div className="h-2 bg-gradient-to-r from-green-400 via-red-400 to-yellow-300 hidden"></div>
                </div>
            </div>
        </div>
    )
}
