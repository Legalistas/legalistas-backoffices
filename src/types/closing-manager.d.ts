export interface Lawyer {
  id: number;
  name: string;
  image: string | null;
}

export interface Case {
  id: number;
  number: string;
  customerId: number;
  title: string;
  status: string;
  isActive: boolean;
  internalLawyerId: number;
  responsibleLawyerId: number;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  servicesId: number;
  stageId: number;
  statusDate: string | null;
  responsibleLawyer: Lawyer;
  internalLawyer?: Lawyer;
}

export interface ClosingManagerEntry {
  id: number;
  caseId: number;
  negotiationId?: number | null;
  date: string;
  type: string;

  // Capital
  capitalAmount: number;
  capitalState: string;

  // Honorarios Pactados (HP)
  hpAgreed: number;
  hpTotal: number;
  hpDistribution: boolean;
  feeStatus: string;

  // PCL (Pacto de Cuota Litis)
  pclAgreed: number | null;
  pclTotal: number | null;
  pclDistribution: boolean;
  pclStatus: string | null;

  // Aportes
  contributionsAmount: number;
  applyContributions: boolean;

  // Detalle
  detail: string | null;

  createdAt: string;
  updatedAt: string;

  // Relaciones
  case: Case;
  negotiation?: {
    id: number;
    status: string;
  } | null;

  // Campos calculados (retornados por el backend)
  hpRepresentante: number;
  hpLegalistas: number;
  pclRepresentante: number;
  pclLegalistas: number;
  aportesRepresentante: number;
  aportesLegalistas: number;
  montoTransferir: number;

  // Gastos de la causa (solo lectura, desde CasesExpenses)
  totalCaseExpenses: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClosingManagerApiResponse {
  data: ClosingManagerEntry[];
  meta: Pagination;
}

export interface ClosingKpis {
  view: "monthly" | "annual";
  month?: number;
  year: number;
  count: number;
  totalCapital: number;
  totalHonorarios: number;
  totalNetoLegalistas: number;
  totalTransferir: number;
}

export interface ClosingKpisApiResponse {
  data: ClosingKpis;
}
