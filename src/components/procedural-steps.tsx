import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProceduralStepsProps {
    steps: string[]
    currentStep: number
    className?: string
}

export function ProceduralSteps({ steps, currentStep, className }: ProceduralStepsProps) {
    return (
        <div className={cn("w-full", className)}>
            <div className="relative flex justify-between">
                {/* Progress bar background */}
                <div className="absolute top-1/2 left-0 h-1 w-full -translate-y-1/2 bg-gray-200"></div>

                {/* Active progress bar */}
                <div
                    className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-purple-600 transition-all duration-300"
                    style={{
                        width: `${Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100)}%`,
                    }}
                ></div>

                {/* Steps */}
                {steps.map((step, index) => {
                    const stepNumber = index + 1
                    const isCompleted = stepNumber < currentStep
                    const isCurrent = stepNumber === currentStep
                    const isUpcoming = stepNumber > currentStep

                    return (
                        <div key={index} className="relative flex flex-col items-center">
                            {/* Step circle */}
                            <div
                                className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-all",
                                    isCompleted
                                        ? "border-purple-600 bg-purple-600 text-white"
                                        : isCurrent
                                            ? "border-purple-600 bg-white text-purple-600 ring-4 ring-purple-100"
                                            : "border-gray-300 bg-white text-gray-400",
                                )}
                            >
                                {isCompleted ? <CheckIcon className="h-5 w-5" /> : stepNumber}
                            </div>

                            {/* Step label */}
                            <span
                                className={cn(
                                    "mt-2 text-xs font-medium text-center max-w-[80px]",
                                    isCompleted || isCurrent ? "text-purple-600" : "text-gray-500",
                                )}
                            >
                                {step}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
