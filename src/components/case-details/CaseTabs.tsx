"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs/Tabs"
import type { CaseLogs, CasesFiles, CasesNotes, CaseConsultations, CasesDocuments } from "@/types/cases"
import { FilesListView } from "./FilesListView"
import { NotesView } from "./NotesView"
import CaseLogsComponent from "./CaseLogsComponent"
import { useRouter, useSearchParams } from "next/navigation"
import ConsultationsView from "./ConsultationsView"
import CaseDocuments from "./CaseDocuments"
import { EventosView } from "./EventosView"
import { PlazosView } from "./PlazosView"
import { LiquidacionView } from "./LiquidacionView"
import { PartesView } from "./PartesView"
import { GastosView } from "./GastosView"
import { CedulasView } from "./CedulasView"

interface CaseTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  notes: CasesNotes[]
  logs: CaseLogs[]
  documents?: CasesDocuments[]
  consultation: CaseConsultations[]
  caseId: string
  filteredFiles: CasesFiles[]
  onAddNewFile: () => void
  onNotesUpdated?: () => void
  customer: {
    name: string
  }
  responsibleLawyer?: { id: number; name: string; image?: string | null } | null
  internalLawyer?: { id: number; name: string; image?: string | null } | null
}

export const CaseTabs = ({
  activeTab,
  onTabChange,
  notes = [],
  logs = [],
  consultation = [],
  documents = [],
  caseId,
  filteredFiles,
  onAddNewFile,
  customer,
  onNotesUpdated = () => { },
  responsibleLawyer,
  internalLawyer,
}: CaseTabsProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get("tab") || activeTab)

  useEffect(() => {
    const urlTab = searchParams.get("tab")
    if (urlTab && urlTab !== tab) setTab(urlTab)
  }, [])

  const handleTabChange = (newTab: string) => {
    setTab(newTab)
    onTabChange(newTab)
    const params = new URLSearchParams(window.location.search)
    params.set("tab", newTab)
    router.replace(`${window.location.pathname}?${params.toString()}`)
  }

  const handleCreateConsultation = () => {
    router.refresh()
  }

  const handleNoteCreated = () => {
    onNotesUpdated()
    router.push(`/admin/legal-cases/${caseId}`)
  }

  const handleDocumentLoad = () => {
    router.refresh()
  }

  const tabContentClass = "bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100"

  return (
    <Tabs defaultValue={tab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100 p-2 overflow-x-auto">
        <TabsTrigger value="files">Expedientes</TabsTrigger>
        <TabsTrigger value="eventos">Eventos</TabsTrigger>
        <TabsTrigger value="plazos">Plazos</TabsTrigger>
        <TabsTrigger value="documents">Documentos</TabsTrigger>
        <TabsTrigger value="notes">Notas</TabsTrigger>
        <TabsTrigger value="liquidacion">Liquidación</TabsTrigger>
        <TabsTrigger value="partes">Partes</TabsTrigger>
        <TabsTrigger value="gastos">Gastos</TabsTrigger>
        <TabsTrigger value="cedulas">Cédulas</TabsTrigger>
        <TabsTrigger value="consultations">Consultas</TabsTrigger>
      </TabsList>

      {/* 1. Expedientes */}
      <TabsContent value="files" className={tabContentClass}>
        <FilesListView files={filteredFiles} caseId={caseId} customer={customer} onAddNewFile={onAddNewFile} />
      </TabsContent>

      {/* 2. Eventos */}
      <TabsContent value="eventos" className={tabContentClass}>
        <EventosView files={filteredFiles} caseId={caseId} responsibleLawyer={responsibleLawyer} internalLawyer={internalLawyer} />
      </TabsContent>

      {/* 3. Plazos */}
      <TabsContent value="plazos" className={tabContentClass}>
        <PlazosView files={filteredFiles} caseId={caseId} responsibleLawyer={responsibleLawyer} internalLawyer={internalLawyer} />
      </TabsContent>

      {/* 4. Documentos */}
      <TabsContent value="documents" className={tabContentClass}>
        <CaseDocuments documents={documents} caseId={caseId} onDocumentLoad={handleDocumentLoad} />
      </TabsContent>

      {/* 5. Notas */}
      <TabsContent value="notes" className={tabContentClass}>
        <NotesView notes={notes} caseId={caseId} onNoteCreated={handleNoteCreated} responsibleLawyer={responsibleLawyer} internalLawyer={internalLawyer} />
      </TabsContent>

      {/* 6. Liquidación */}
      <TabsContent value="liquidacion" className={tabContentClass}>
        <LiquidacionView />
      </TabsContent>

      {/* 7. Partes */}
      <TabsContent value="partes" className={tabContentClass}>
        <PartesView />
      </TabsContent>

      {/* 8. Gastos */}
      <TabsContent value="gastos" className={tabContentClass}>
        <GastosView />
      </TabsContent>

      {/* 9. Cédulas */}
      <TabsContent value="cedulas" className={tabContentClass}>
        <CedulasView />
      </TabsContent>

      {/* 10. Consultas */}
      <TabsContent value="consultations" className={tabContentClass}>
        <ConsultationsView consultations={consultation} caseId={caseId} onCreateConsultation={handleCreateConsultation} />
      </TabsContent>
    </Tabs>
  )
}
