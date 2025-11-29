"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface DialogContextValue {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined)

const useDialog = () => {
    const context = React.useContext(DialogContext)
    if (!context) {
        throw new Error("Dialog components must be used within Dialog")
    }
    return context
}

interface DialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
    const [internalOpen, setInternalOpen] = React.useState(false)

    const isControlled = open !== undefined
    const isOpen = isControlled ? open : internalOpen

    const handleOpenChange = (newOpen: boolean) => {
        if (!isControlled) {
            setInternalOpen(newOpen)
        }
        onOpenChange?.(newOpen)
    }

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }

        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isOpen])

    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                handleOpenChange(false)
            }
        }

        document.addEventListener("keydown", handleEscape)
        return () => document.removeEventListener("keydown", handleEscape)
    }, [isOpen])

    return (
        <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
            {children}
        </DialogContext.Provider>
    )
}

interface DialogTriggerProps {
    children: React.ReactNode
    asChild?: boolean
}

export const DialogTrigger = ({ children, asChild = false }: DialogTriggerProps) => {
    const { onOpenChange } = useDialog()

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: () => onOpenChange(true),
        })
    }

    return (
        <button type="button" onClick={() => onOpenChange(true)}>
            {children}
        </button>
    )
}

interface DialogPortalProps {
    children: React.ReactNode
}

export const DialogPortal = ({ children }: DialogPortalProps) => {
    const { open } = useDialog()

    if (!open) return null

    return typeof document !== "undefined"
        ? createPortal(children, document.body)
        : null
}

interface DialogOverlayProps {
    className?: string
}

export const DialogOverlay = ({ className = "" }: DialogOverlayProps) => {
    const { onOpenChange } = useDialog()

    return (
        <div
            className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
            onClick={() => onOpenChange(false)}
        />
    )
}

interface DialogContentProps {
    children: React.ReactNode
    className?: string
    showCloseButton?: boolean
}

export const DialogContent = ({
    children,
    className = "",
    showCloseButton = true,
}: DialogContentProps) => {
    const { open, onOpenChange } = useDialog()

    if (!open) return null

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => onOpenChange(false)}
                />
                <div
                    className={`relative z-50 w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg dark:bg-gray-900 dark:border-gray-800 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                    {showCloseButton && (
                        <button
                            onClick={() => onOpenChange(false)}
                            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none dark:ring-offset-gray-950 dark:focus:ring-gray-300"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}

interface DialogHeaderProps {
    children: React.ReactNode
    className?: string
}

export const DialogHeader = ({ children, className = "" }: DialogHeaderProps) => {
    return (
        <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>
            {children}
        </div>
    )
}

interface DialogFooterProps {
    children: React.ReactNode
    className?: string
}

export const DialogFooter = ({ children, className = "" }: DialogFooterProps) => {
    return (
        <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}>
            {children}
        </div>
    )
}

interface DialogTitleProps {
    children: React.ReactNode
    className?: string
}

export const DialogTitle = ({ children, className = "" }: DialogTitleProps) => {
    return (
        <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
            {children}
        </h2>
    )
}

interface DialogDescriptionProps {
    children: React.ReactNode
    className?: string
}

export const DialogDescription = ({ children, className = "" }: DialogDescriptionProps) => {
    return (
        <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
            {children}
        </p>
    )
}
