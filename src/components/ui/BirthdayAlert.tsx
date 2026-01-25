"use client"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import Button from "./button/Button"
import Image from "next/image"

// Componente de confeti animado
function Confetti() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="absolute animate-confetti"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${3 + Math.random() * 2}s`,
                    }}
                >
                    <div
                        className="w-2 h-2 rounded-sm"
                        style={{
                            backgroundColor: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9ff3', '#54a0ff'][Math.floor(Math.random() * 6)],
                            transform: `rotate(${Math.random() * 360}deg)`,
                        }}
                    />
                </div>
            ))}
        </div>
    )
}

export default function BirthdayAlert() {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        // Verificar si ya se cerró el popup
        const birthdayAlertClosed = document.cookie
            .split("; ")
            .find(row => row.startsWith("birthday_martina_closed="))
            ?.split("=")[1]

        if (!birthdayAlertClosed) {
            // Mostrar después de 1.5 segundos
            setTimeout(() => {
                setIsVisible(true)
                setIsAnimating(true)
            }, 1500)
        }
    }, [])

    const handleClose = () => {
        setIsAnimating(false)
        setTimeout(() => {
            // Guardar en cookie que se cerró (expira en 1 día para que al día siguiente no aparezca)
            const expirationDate = new Date()
            expirationDate.setDate(expirationDate.getDate() + 1)
            document.cookie = `birthday_martina_closed=true; expires=${expirationDate.toUTCString()}; path=/`
            setIsVisible(false)
        }, 300)
    }

    if (!isVisible) return null

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
            <Confetti />
            <div className={`relative max-w-md w-full mx-4 transition-all duration-500 ${isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}>
                {/* Botón cerrar */}
                <button
                    onClick={handleClose}
                    className="absolute -top-3 -right-3 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-all duration-200 hover:scale-110 hover:rotate-90"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* Tarjeta de cumpleaños */}
                <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden animate-pulse-glow">
                    {/* Decoración superior con confeti */}
                    <div className="h-2 bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 animate-shimmer"></div>
                    
                    {/* Logo de Legalistas */}
                    <div className="flex justify-center pt-6 pb-2">
                        <div className="shadow-lg animate-float">
                            <Image
                                src="/images/logo/logo-icon.svg"
                                alt="Legalistas"
                                width={50}
                                height={50}
                                className="w-12 h-12"
                            />
                        </div>
                    </div>
                    
                    {/* Contenido */}
                    <div className="px-8 pb-8 text-center text-white">
                        {/* Emojis decorativos animados */}
                        <div className="text-5xl mb-3 flex justify-center gap-3">
                            <span className="animate-bounce-slow inline-block" style={{ animationDelay: '0s' }}>🎂</span>
                            <span className="animate-bounce-slow inline-block" style={{ animationDelay: '0.2s' }}>🎉</span>
                            <span className="animate-bounce-slow inline-block" style={{ animationDelay: '0.4s' }}>🎈</span>
                        </div>

                        {/* Título con efecto de brillo */}
                        <h2 className="text-3xl font-bold mb-2 drop-shadow-lg animate-pulse-soft">
                            ¡Feliz Cumpleaños!
                        </h2>

                        {/* Nombre destacado con gradiente animado */}
                        <div className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
                            🌟 Martina 🌟
                        </div>

                        {/* Mensaje */}
                        <div className="text-sm mb-5 leading-relaxed space-y-3 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                            <p className="opacity-95">
                                Hoy es un día muy especial porque celebramos tu cumpleaños. 
                            </p>

                            <p className="opacity-95">
                                Todo el equipo de <span className="font-semibold">Legalistas</span> te desea un día lleno de alegría, 
                                sorpresas y mucho amor. ¡Que todos tus sueños se hagan realidad!
                            </p>

                            <p className="font-semibold text-base text-yellow-200">
                                ¡Que cumplas muchos más! 🥳
                            </p>
                        </div>

                        {/* Iconos decorativos con animación escalonada */}
                        <div className="flex justify-center gap-4 text-2xl mb-5">
                            <span className="animate-wiggle inline-block" style={{ animationDelay: '0s' }}>🎁</span>
                            <span className="animate-wiggle inline-block" style={{ animationDelay: '0.15s' }}>💝</span>
                            <span className="animate-wiggle inline-block" style={{ animationDelay: '0.3s' }}>🎊</span>
                            <span className="animate-wiggle inline-block" style={{ animationDelay: '0.45s' }}>✨</span>
                            <span className="animate-wiggle inline-block" style={{ animationDelay: '0.6s' }}>🎀</span>
                        </div>

                        {/* Botón con efecto hover */}
                        <Button
                            onClick={handleClose}
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 font-bold px-8 py-3 text-base shadow-xl border-2 border-white/30 transform hover:scale-105 transition-all duration-300 hover:shadow-yellow-500/50 hover:shadow-2xl"
                        >
                            ¡Felicidades Martina! 🎂
                        </Button>

                        {/* Firma */}
                        <p className="mt-5 text-sm font-medium opacity-90">
                            Con cariño, el equipo de Legalistas 💜
                        </p>
                    </div>

                    {/* Decoración inferior */}
                    <div className="h-2 bg-gradient-to-r from-cyan-400 via-pink-400 to-yellow-400 animate-shimmer"></div>
                </div>
            </div>

            {/* Estilos de animación personalizados */}
            <style jsx>{`
                @keyframes confetti {
                    0% {
                        transform: translateY(-100%) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                
                @keyframes shimmer {
                    0% {
                        background-position: -200% center;
                    }
                    100% {
                        background-position: 200% center;
                    }
                }
                
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
                
                @keyframes bounce-slow {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-15px);
                    }
                }
                
                @keyframes wiggle {
                    0%, 100% {
                        transform: rotate(-5deg);
                    }
                    50% {
                        transform: rotate(5deg);
                    }
                }
                
                @keyframes pulse-soft {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
                
                @keyframes gradient-x {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }
                
                @keyframes pulse-glow {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(236, 72, 153, 0.3), 0 0 40px rgba(139, 92, 246, 0.2);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(236, 72, 153, 0.5), 0 0 60px rgba(139, 92, 246, 0.3);
                    }
                }
                
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                :global(.animate-confetti) {
                    animation: confetti linear forwards;
                }
                
                :global(.animate-shimmer) {
                    background-size: 200% 100%;
                    animation: shimmer 2s linear infinite;
                }
                
                :global(.animate-float) {
                    animation: float 3s ease-in-out infinite;
                }
                
                :global(.animate-bounce-slow) {
                    animation: bounce-slow 1.5s ease-in-out infinite;
                }
                
                :global(.animate-wiggle) {
                    animation: wiggle 0.5s ease-in-out infinite;
                }
                
                :global(.animate-pulse-soft) {
                    animation: pulse-soft 2s ease-in-out infinite;
                }
                
                :global(.animate-gradient-x) {
                    animation: gradient-x 3s ease infinite;
                }
                
                :global(.animate-pulse-glow) {
                    animation: pulse-glow 2s ease-in-out infinite;
                }
                
                :global(.animate-fade-in-up) {
                    animation: fade-in-up 0.6s ease-out forwards;
                }
            `}</style>
        </div>
    )
}
