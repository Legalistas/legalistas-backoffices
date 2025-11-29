"use client"

import { use, useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs/Tabs"
import type { CaseLogs, CasesFiles, CasesNotes, CaseConsultations, CasesDocuments } from "@/types/cases"
import { EmptyFilesState } from "./EmptyFilesState"
import { FilesCardView } from "./FilesCardView"
import { FilesListView } from "./FilesListView"
import { NotesView } from "./NotesView"
import { EmptyNotesState } from "./EmptyNotesState"
import CaseLogsComponent from "./CaseLogsComponent"
import { useRouter, useSearchParams } from "next/navigation"
import ConsultationsView from "./ConsultationsView"
import CaseDocuments from "./CaseDocuments"

interface CaseTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  files: CasesFiles[]
  notes: CasesNotes[]
  logs: CaseLogs[]
  documents?: CasesDocuments[]
  consultation: CaseConsultations[]
  caseId: string
  viewMode: "card" | "list"
  fileTypeFilter: number
  filteredFiles: CasesFiles[]
  onAddNewFile: () => void
  onClearFilter: () => void
  onNotesUpdated?: () => void
  customer: {
    name: string
  }
}

export const CaseTabs = ({
  activeTab,
  onTabChange,
  files,
  notes = [],
  logs = [],
  consultation = [],
  documents = [],
  caseId,
  viewMode,
  fileTypeFilter,
  filteredFiles,
  onAddNewFile,
  onClearFilter,
  customer,
  onNotesUpdated = () => { },
}: CaseTabsProps) => {
  const [isCreatingNote, setIsCreatingNote] = useState(false)
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
    setIsCreatingNote(false)
    onNotesUpdated()
    router.push(`/admin/legal-cases/${caseId}`)
  }

  const handleAddNewNote = () => {
    setIsCreatingNote(true)
  }

  const handleDocumentLoad = () => {
    router.refresh()
  }


  return (
    <Tabs defaultValue={tab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100 p-2">
        <TabsTrigger value="files">Expedientes</TabsTrigger>
        <TabsTrigger value="consultations">
          Consultas
        </TabsTrigger>
        <TabsTrigger value="notes">Notas</TabsTrigger>
        <TabsTrigger value="documents">Documentos</TabsTrigger>
        <TabsTrigger value="record">Historial</TabsTrigger>
      </TabsList>

      <TabsContent value="files" className="bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100">
        {!files || files.length === 0 ? (
          <EmptyFilesState
            noFiles={true}
            fileTypeFilter={fileTypeFilter}
            onAddNewFile={onAddNewFile}
            onClearFilter={onClearFilter}
          />
        ) : filteredFiles.length === 0 ? (
          <EmptyFilesState
            noFiles={false}
            fileTypeFilter={fileTypeFilter}
            onAddNewFile={onAddNewFile}
            onClearFilter={onClearFilter}
          />
        ) : viewMode === "list" ? (
          <FilesListView files={filteredFiles} caseId={caseId} customer={customer} />
        ) : (
          <FilesCardView files={filteredFiles} caseId={caseId} customer={customer} />
        )}
      </TabsContent>

      <TabsContent value="consultations" className="bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100">
        <ConsultationsView consultations={consultation} caseId={caseId} onCreateConsultation={handleCreateConsultation} />
      </TabsContent>

      <TabsContent value="notes" className="bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100">
        {isCreatingNote || (notes && notes.length > 0) ? (
          <NotesView notes={notes} caseId={caseId} onNoteCreated={handleNoteCreated} />
        ) : (
          <EmptyNotesState onAddNewNote={handleAddNewNote} />
        )}
      </TabsContent>


      <TabsContent value="documents" className="bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100">
        <CaseDocuments documents={documents} caseId={caseId} onDocumentLoad={handleDocumentLoad} />
      </TabsContent>

      <TabsContent value="record" className="bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100">
        <CaseLogsComponent logs={logs} />
      </TabsContent>
    </Tabs>
  )
}
