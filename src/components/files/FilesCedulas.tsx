'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, FileText, Download, Trash2, Calendar, User, Printer } from 'lucide-react'
import { Editor } from '@tinymce/tinymce-react'
import { CEDULA_TEMPLATES } from '@/constants/cedula-templates'

interface Cedula {
    id: number
    fileId: number
    cedulaType: string
    partId: number
    partName?: string
    content: string
    generatedDate: string
    status: string
    createdAt: string
    updatedAt: string
}

interface FilesCedulasProps {
    caseId: number
    fileId: number
    cedulas?: Cedula[]
    parts?: any[]
    onCedulasChange?: (cedulas: Cedula[]) => void
    onRefresh?: () => void
}

export default function FilesCedulas({
    caseId,
    fileId,
    cedulas = [],
    parts = [],
    onCedulasChange,
    onRefresh
}: FilesCedulasProps) {
    const { data: session } = useSession()
    const [isAddingCedula, setIsAddingCedula] = useState(false)
    const [newCedula, setNewCedula] = useState({
        cedulaType: 'carta_certificada',
        partId: '',
        content: CEDULA_TEMPLATES.carta_certificada,
    })

    // Cambiar template cuando cambia el tipo de cédula
    const handleCedulaTypeChange = (type: string) => {
        setNewCedula({
            ...newCedula,
            cedulaType: type,
            content: CEDULA_TEMPLATES[type as keyof typeof CEDULA_TEMPLATES] || ''
        })
    }

    const handleAddCedula = async () => {
        if (!session?.user?.accessToken) return

        try {
            // TODO: Implementar endpoint para crear cédula
            // const response = await fetch(CEDULAS_ENDPOINT(caseId, fileId), {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         Authorization: `Bearer ${session.user.accessToken}`,
            //     },
            //     body: JSON.stringify(newCedula),
            // })

            // const data = await response.json()
            // onRefresh?.()

            setIsAddingCedula(false)
            setNewCedula({
                cedulaType: 'carta_certificada',
                partId: '',
                content: CEDULA_TEMPLATES.carta_certificada,
            })
        } catch (error) {
            console.error('Error al crear cédula:', error)
        }
    }

    const handleDeleteCedula = async (cedulaId: number) => {
        if (!session?.user?.accessToken) return
        if (!confirm('¿Está seguro de eliminar esta cédula?')) return

        try {
            // TODO: Implementar endpoint para eliminar cédula
            // await fetch(CEDULA_ENDPOINT(caseId, fileId, cedulaId), {
            //     method: 'DELETE',
            //     headers: {
            //         Authorization: `Bearer ${session.user.accessToken}`,
            //     },
            // })
            // onRefresh?.()
        } catch (error) {
            console.error('Error al eliminar cédula:', error)
        }
    }

    const handlePrintCedula = (cedula: Cedula) => {
        // Crear una ventana nueva para imprimir
        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        // Escribir el contenido HTML con estilos de impresión
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Cédula - ${cedula.cedulaType === 'carta_certificada' ? 'Carta Certificada' : 'Común'}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 2cm;
                    }
                    
                    body {
                        font-family: Calibri, Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        color: #000;
                        background: white;
                    }
                    
                    /* Preservar espacios y formato */
                    p {
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                    
                    /* Respetar todos los estilos inline del HTML */
                    * {
                        box-sizing: border-box;
                    }
                    
                    @media print {
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }
                        
                        /* Evitar saltos de página dentro de elementos */
                        p, span, strong, em {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                ${cedula.content}
            </body>
            </html>
        `)

        printWindow.document.close()

        // Esperar a que se cargue y luego imprimir
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print()
            }, 250)
        }
    }

    const handleDownloadCedula = async (cedulaId: number) => {
        // TODO: Implementar descarga de cédula
        console.log('Descargar cédula:', cedulaId)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Cédulas Automáticas
                </h3>
                <button
                    onClick={() => setIsAddingCedula(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={18} />
                    Nueva Cédula
                </button>
            </div>

            {/* Formulario para agregar cédula */}
            {isAddingCedula && (
                <div className="bg-gray-50 dahandleCedulaTypeChange(e.target.valuey-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Nueva Cédula</h4>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tipo de Cédula *
                        </label>
                        <select
                            value={newCedula.cedulaType}
                            onChange={(e) => setNewCedula({ ...newCedula, cedulaType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                            <option value="carta_certificada">Carta certificada al demandado</option>
                            <option value="comun_cualquiera">Común a cualquiera</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Parte *
                        </label>
                        <select
                            value={newCedula.partId}
                            onChange={(e) => setNewCedula({ ...newCedula, partId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">Seleccione una parte</option>
                            {parts.map((part) => (
                                <option key={part.id} value={part.id}>
                                    {part.name} - {part.role}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Contenido de la Cédula *
                        </label>
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                            <Editor
                                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                value={newCedula.content}
                                onEditorChange={(content) => setNewCedula({ ...newCedula, content })}
                                init={{
                                    height: "700px",
                                    menubar: true,
                                    plugins: [
                                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                    ],
                                    toolbar: 'undo redo | blocks | bold italic underline strikethrough | ' +
                                        'alignleft aligncenter alignright alignjustify | ' +
                                        'bullist numlist outdent indent | removeformat | help',
                                    // content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; }',
                                    language: 'es',
                                    content_style: `
                                        body { background: #fff; }
                                        .editable-section:focus-visible { outline: none !important; }
                                        .header, .footer { font-size: 0.8rem; color: #ddd; }
                                        .header {
                                            display: flex;
                                            justify-content: space-between;
                                            padding: 0 0 1rem 0;
                                        }
                                        .header .right-text { text-align: right; }
                                        .footer {
                                            padding:2rem 0 0 0;
                                            text-align: center;
                                        }
                                        @media (min-width: 840px) {
                                            html {
                                                background: #eceef4;
                                                min-height: 100%;
                                                padding: 0.5rem;
                                            }
                                            body {
                                                background-color: #fff;
                                                box-shadow: 0 0 4px rgba(0, 0, 0, .15);
                                                box-sizing: border-box;
                                                margin: 1rem auto 0;
                                                max-width: 820px;
                                                min-height: calc(100vh - 1rem);
                                                padding: 2rem 6rem 2rem 6rem;
                                            }
                                        }
                                    `,
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setIsAddingCedula(false)}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAddCedula}
                            disabled={!newCedula.partId || !newCedula.content}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Crear Cédula
                        </button>
                    </div>
                </div>
            )}

            {/* Listado de cédulas */}
            <div className="space-y-3">
                {cedulas.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <FileText size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No hay cédulas registradas</p>
                        <p className="text-sm">Cree una nueva cédula para comenzar</p>
                    </div>
                ) : (
                    cedulas.map((cedula) => (
                        <div
                            key={cedula.id}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                            {cedula.cedulaType === 'carta_certificada'
                                                ? 'Carta certificada al demandado'
                                                : 'Común a cualquiera'}
                                        </h4>
                                        <span className={`px-2 py-1 text-xs rounded-full ${cedula.status === 'generada'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : cedula.status === 'pendiente'
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                            }`}>
                                            {cedula.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <User size={16} />
                                        <span>{cedula.partName || 'Parte no especificada'}</span>
                                    </div>

                                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                        <div dangerouslySetInnerHTML={{ __html: cedula.content }} />
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                                        <Calendar size={16} />
                                        <span>
                                            {new Date(cedula.generatedDate || cedula.createdAt).toLocaleDateString('es-AR')}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePrintCedula(cedula)}
                                        className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                        title="Imprimir cédula"
                                    >
                                        <Printer size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDownloadCedula(cedula.id)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                        title="Descargar cédula"
                                    >
                                        <Download size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCedula(cedula.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="Eliminar cédula"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
