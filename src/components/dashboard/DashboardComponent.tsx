"use client";
import { useMemo, useEffect, useState } from 'react';
import { Role } from '@/constant/user';
import { useSession } from 'next-auth/react';
import SalesOverview from './SalesOverview';
import SalesPerformance from './SalesPerformance';
import { SalesConversion } from './SalesConversion';
import { SalesLead } from './SalesLead';
import { SalesSource } from './SalesSource';
import { SalesLocation } from './SalesLocation';
import { LawyerOverview } from './LawyerOverview';
import LegalCases from './LegalCases';
import LegalEvents from './LegalEvents';

function WomensDayPopup({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}>
            <div
                className="relative max-w-md w-full rounded-2xl p-8 text-center shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)' }}
                onClick={(e) => e.stopPropagation()}>

                {/* Flores decorativas */}
                <div className="text-5xl mb-3 select-none">🌸💜🌷</div>

                <h2 className="text-white text-2xl font-bold mb-2 drop-shadow">
                    ¡Feliz Día de la Mujer!
                </h2>
                <p className="text-purple-100 text-base mb-1">
                    8 de Marzo — Día Internacional de la Mujer
                </p>
                <p className="text-white text-sm leading-relaxed mt-3 mb-6 opacity-90">
                    A todas las mujeres que forman parte de nuestro equipo: gracias por su
                    talento, fortaleza y dedicación. Hoy y siempre, ¡las celebramos! 💜
                </p>

                <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-full font-semibold text-purple-700 transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: '#f3e8ff' }}>
                    ¡Gracias! 🌸
                </button>

                {/* Botón X */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-4 text-purple-200 hover:text-white text-xl font-bold leading-none"
                    aria-label="Cerrar">
                    ×
                </button>
            </div>
        </div>
    );
}

export default function DashboardComponent() {
    const { data: session } = useSession();
    const userRole = session?.user?.roleDetails?.name;
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        const today = new Date();
        const isWomensDay = today.getMonth() === 2 && (today.getDate() === 8 || today.getDate() === 9);
        const storageKey = `womens-day-popup-${today.getFullYear()}`;
        const alreadySeen = localStorage.getItem(storageKey);
        if (isWomensDay && !alreadySeen) {
            setShowPopup(true);
        }
    }, []);

    const handleClosePopup = () => {
        const storageKey = `womens-day-popup-${new Date().getFullYear()}`;
        localStorage.setItem(storageKey, 'seen');
        setShowPopup(false);
    };

    const dashboardType = useMemo(() => {
        if (!userRole) return 'default';

        console.log('User role:', userRole); // Debug temporal

        const legalRoles: string[] = [
            Role.DIRECTOR_GENERAL_CEO,
            Role.GERENTE_GENERAL_COO,
            Role.DIRECTORA_AREA_LEGAL,
            Role.COORDINADOR_LEGAL,
            Role.ABOGADO_REPRESENTANTE,
            Role.ASISTENTE_LEGAL,
        ];

        const salesRoles: string[] = [
            Role.DIRECTORA_AREA_VENTAS,
            Role.COORDINADOR_VENTAS,
            Role.GERENTE_VENTAS,
            Role.EJECUTIVO_VENTAS,
            Role.REPRESENTANTE_VENTAS,
            Role.ANALISTA_VENTAS,
        ];

        const isLegal = legalRoles.includes(userRole);
        const isSales = salesRoles.includes(userRole);
        
        console.log('Dashboard type will be:', isLegal ? 'legal' : isSales ? 'sales' : 'default'); // Debug temporal

        if (isLegal) return 'legal';
        if (isSales) return 'sales';
        return 'default';
    }, [userRole]);

    return (
        <div className="flex flex-col h-full">
            {showPopup && <WomensDayPopup onClose={handleClosePopup} />}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">¡Hola 👋 {session?.user?.name}!</h2>
            </div>

            <div className="flex flex-col gap-3 mb-6 w-full">
                {dashboardType === 'sales' && (
                    <>
                        <SalesOverview />
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <SalesPerformance />
                            <SalesConversion />
                        </div>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <SalesLead />
                            <SalesSource />
                            <SalesLocation />
                        </div>
                    </>
                )}

                {dashboardType === 'legal' && <>
                    <LawyerOverview />
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                       <LegalCases />
                       <LegalEvents />
                    </div>
                </>}
            </div>
        </div>
    );
}
