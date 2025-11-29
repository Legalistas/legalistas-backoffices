import { cn } from "@/lib/utils"

interface StatusProgressBarProps {
  steps: string[]
  currentStep: number | string
  className?: string
}

export function StatusProgressBar({ steps, currentStep, className }: StatusProgressBarProps) {
  // Convert currentStep to number if it's a string
  const currentStepNumber = typeof currentStep === "string" ? Number.parseInt(currentStep, 10) : currentStep

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="flex items-center w-full">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber <= currentStepNumber
          const isLast = stepNumber === steps.length

          return (
            <div key={index} className="flex-1 min-w-0 relative">
              {/* Step */}
              <div
                className={cn(
                  "relative flex items-center justify-center h-10 text-sm font-medium transition-colors duration-300",
                  isActive ? "bg-[#09a4b5] text-white" : "bg-gray-200 text-gray-600",
                  index === 0 ? "rounded-l-lg" : "",
                  isLast ? "rounded-r-lg" : "",
                  "px-2"
                )}
              >
                <span className="truncate text-center text-xs sm:text-sm leading-tight">{step}</span>
              </div>

              {/* Connector Arrow */}
              {!isLast && (
                <div
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 rotate-45 z-10"
                  style={{
                    backgroundColor: isActive ? "rgb(9, 164, 181)" : "rgb(229, 231, 235)",
                    marginRight: "-6px",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}