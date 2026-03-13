import { cn } from "@/lib/utils"
import { Check, ChevronRight } from "lucide-react"

interface StatusProgressBarProps {
  steps: string[]
  currentStep: number | string
  className?: string
}

export function StatusProgressBar({ steps, currentStep, className }: StatusProgressBarProps) {
  const currentStepNumber = typeof currentStep === "string" ? Number.parseInt(currentStep, 10) : currentStep

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStepNumber
          const isCurrent = stepNumber === currentStepNumber
          const isActive = stepNumber <= currentStepNumber
          const isLast = stepNumber === steps.length

          return (
            <div key={index} className="flex items-center gap-1">
              {/* Step */}
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-300",
                  isCurrent
                    ? "bg-[#09a4b5] text-white"
                    : isCompleted
                      ? "bg-[#09a4b5]/10 text-[#09a4b5]"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500"
                )}
              >
                {/* Circle indicator */}
                <div
                  className={cn(
                    "shrink-0 flex items-center justify-center rounded-full",
                    isCurrent
                      ? "h-5 w-5 bg-white/20"
                      : isCompleted
                        ? "h-5 w-5 bg-[#09a4b5] text-white"
                        : "h-5 w-5 bg-gray-200 dark:bg-gray-600"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    <span className="text-[10px] font-bold">{stepNumber}</span>
                  )}
                </div>

                {/* Label */}
                <span className="text-[11px] font-medium whitespace-nowrap">{step}</span>
              </div>

              {/* Chevron separator */}
              {!isLast && (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive && !isCurrent ? "text-[#09a4b5]" : "text-gray-300 dark:text-gray-600"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
