"use client";
import { useMemo } from 'react';
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

export default function DashboardComponent() {
    const { data: session } = useSession();
    const userRole = session?.user?.roleDetails?.name;

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
