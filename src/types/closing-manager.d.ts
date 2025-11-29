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
  responsibleLawyer: {
    id: number;
    name: string;
    image: string | null;
  };
}

export interface ClosingManagerEntry {
  id: number;
  caseId: number;
  negotiationId?: number | null;
  date: string;
  type: string;
  capitalAmount: number;
  capitalState: string;
  hpAgreed: number;
  feeStatus: string;
  pclAgreed: string | null;
  pclStatus: string | null;
  litigation: string | null;
  contributions?: string;
  createdAt: string;
  updatedAt: string;
  case: Case;
  negotiation?: {
    id: number;
    title: string;
    lesion: string;
  } | null;
  // Campos calculados para la tabla
  fechaCierre: string;
  nombreCausa: string;
  expediente: string;
  abogadoInterno: string;
  tipo: string;
  estadoCapital: string;
  hpAcordado: number;
  estadoHonorarios: string;
  estadoPcl: string | null;
  litigio: string | null;
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
