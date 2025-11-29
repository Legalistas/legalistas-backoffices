"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Button from "@/components/ui/button/Button"
import { StatusProgressBar } from "@/components/status-progress-bar"

interface CaseHeaderProps {
  title: string | undefined
  number: string | undefined
  currentStep: number
  steps: string[]
}

export const CaseHeader = ({ title, number, currentStep, steps }: CaseHeaderProps) => {
  const router = useRouter()

  const handleBackClick = () => {
    // Usar router.back() para mantener el estado anterior (filtros, paginación, etc.)
    if (window.history.length > 1) {
      router.back()
    } else {
      // Si no hay historial (acceso directo), ir a legal-cases
      router.push("/admin/legal-cases")
    }
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center min-w-0 flex-1">
          <Button variant="outline" size="sm" onClick={handleBackClick} className="mr-4 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight truncate text-gray-dark dark:text-gray-100">
            {`Caso #${number} - ${title}`}
          </h1>
        </div>

        {/* Versión móvil - simplificada */}
        <div className="sm:hidden w-full overflow-x-auto pb-2">
          <StatusProgressBar
            steps={steps.map((step) => step.split(" ")[0])} // Solo muestra la primera palabra en móvil
            currentStep={currentStep}
            className="w-full"
          />
        </div>

        {/* Versión tablet y desktop */}
        <div className="hidden sm:flex sm:justify-end sm:shrink-0">
          <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl">
            <StatusProgressBar steps={steps} currentStep={currentStep} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

