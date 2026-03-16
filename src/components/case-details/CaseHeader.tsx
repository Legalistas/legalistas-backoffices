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
    router.back()
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center min-w-0 flex-1">
          <Button variant="outline" size="sm" onClick={handleBackClick} className="mr-4 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        {/* Progress bar */}
        <div className="flex-1 min-w-0">
          <StatusProgressBar steps={steps} currentStep={currentStep} className="w-full" />
        </div>
      </div>
    </div>
  )
}

