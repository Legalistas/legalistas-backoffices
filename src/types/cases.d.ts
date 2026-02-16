export interface User {
  id: number;
  name: string;
  email: string;
  image: string;
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
