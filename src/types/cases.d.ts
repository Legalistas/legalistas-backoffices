export interface User {
  id: number;
  name: string;
  email: string;
  image: string;
  userProfile?: { phone?: string };
}

export interface CasesFiles {
  id: string;
  caseId: string;
  title: string;
  description: string;
  filetype: number;
  proceduralStageId: number;
  observation: string;
  cuij: string;
  courtId: number;
  jurisdictionId?: number | null;
  typeProcessId: number;
  statusProcessId: number;
  startDate: string;
  instanceExpiration: string;
  lastMovementDate?: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  court: Court;
  case: Cases;
  filesParts: any[]; // Assuming filesParts is an array of any type
  fileMovements?: CasesFilesMovement[];
  accidentDate?: string;
  instanceExpiration?: string;
}

export interface CasePart {
  id: number;
  caseId: number;
  fileId?: number | null;
  partyType: string;
  name: string;
  personType: string;
  documentType: string;
  documentNumber?: string | null;
  countryId?: number | null;
  stateId?: number | null;
  city?: string | null;
  postalCode?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  sponsoringLawyer?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  country?: { id: number; name: string } | null;
  state?: { id: number; name: string } | null;
  file?: { id: number; title: string } | null;
}

export interface CaseExpense {
  id: number;
  caseId: number;
  fileId?: number | null;
  description?: string | null;
  amount: number;
  date?: string | null;
  category?: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  file?: { id: number; title: string } | null;
  user?: { id: number; name: string } | null;
}

export interface CaseEvent {
  id: number;
  caseId: number;
  fileId?: number | null;
  type: number;
  subType?: number | null;
  title?: string | null;
  date: string;
  time?: string | null;
  location?: string | null;
  observation?: string | null;
  status: string;
  schedule: number;
  responsibleId: number;
  createdAt: string;
  updatedAt: string;
  file?: {
    id: number;
    title: string;
    cuij?: string;
  } | null;
  responsiblePerson: {
    id: number;
    name: string;
    email: string;
    image?: string;
  };
}

export interface CaseDeadline {
  id: number;
  caseId: number;
  fileId?: number | null;
  jurisdictionId: number;
  deadlineTypeId?: number | null;
  type?: string | null;
  title: string;
  description?: string | null;
  responsibleId: number;
  mode: string;
  notificationDate?: string | null;
  daysCount?: number | null;
  daysType?: string | null;
  dueDate: string;
  dueTime?: string | null;
  advanceNoticeDays: number;
  schedule: number;
  calculationDetail?: {
    tipo_dias: string;
    cantidad_dias: number;
    fecha_notificacion: string;
    fecha_inicio_computo: string;
    fecha_original_vencimiento: string | null;
    dias_habiles_contados: number;
    fines_semana_excluidos: number;
    feriados_excluidos: { fecha: string; descripcion: string }[];
    prorrogado_por_inhabil: boolean;
    calculado_at: string;
  } | null;
  adjustmentReason?: string | null;
  adjustedAt?: string | null;
  originalDueDate?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  file?: {
    id: number;
    title: string;
    cuij?: string;
  } | null;
  responsiblePerson: {
    id: number;
    name: string;
    email: string;
    image?: string;
  };
  jurisdiction: {
    id: number;
    name: string;
  };
  deadlineType?: {
    id: number;
    code: string;
    name: string;
    daysCount: number;
    daysType: string;
    article?: string | null;
    extendable: boolean;
    peremptory: boolean;
  } | null;
}

export interface CasesFilesMovement {
  id: number;
  mode: number;
  type: number;
  subType?: number | null;
  date: string;
  schedule: number;
  status: string;
  observation: string;
  createdAt: string;
  responsiblePerson: {
    id: number;
    name: string;
    email: string;
    image?: string;
  };
}

export interface Cases {
  id: number;
  number?: string;
  customerId: number;
  title?: string;
  servicesId?: number;
  stageId?: number;
  status?: string;
  statusDate?: Date;
  isActive?: boolean;
  isArchived?: boolean;
  internalLawyerId?: number;
  responsibleLawyerId?: number;
  createdAt: Date;
  updatedAt: Date;
  customer: User;
  responsibleLawyer?: User;
  internalLawyer?: User;
  files: CasesFiles[];
  notes: CasesNotes[];
  documents: CasesDocuments[];
  logs: CaseLogs[];
  customer: User;
  consultation: CaseConsultations[];
}

interface Jurisdiction {
  id: number;
  name: string;
}

interface Court {
  id: number;
  charter: string;
  courtName: string;
  jurisdiction: Jurisdiction;
}

export interface CasesNotes {
  id: string;
  caseId: string;
  title: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  user: User;
}

export interface CasesDocuments {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  extension: string;
  uploadedAt: string;
  updatedAt: string;
  caseId: number;
  uploadedById: number;
  description: string;
  isPublic: boolean;
  category: string;
}

export interface CaseLogs {
  id: string;
  caseId: string;
  type: string;
  title: string;
  description: string;
  status: string;
  createdById: number;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface CaseConsultations {
  messages: any;
  id: number;
  caseId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  unreadMessages: number;
  status: "PENDING" | "OPEN" | "CLOSED";
  consultationMessages: CaseConsultationMessages[];
  cases: Cases; // The 'cases' object within the consultation
  files: ConsultationFile[];
}

export interface CaseConsultationMessages {
  id: number;
  consultationId: number;
  sender: "user" | "responsible";
  content: string;
  timestamp: string;
  files?: ConsultationFile[]; // 👈 Agregado
}

interface ConsultationFile {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  extension: string;
  uploadedAt: string;
  description?: string;
  isPublic: boolean;
  category?: string;
}
