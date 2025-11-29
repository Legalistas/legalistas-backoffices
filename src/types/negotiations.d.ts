export type ViewMode = "esperando" | "en-curso" | "finalizadas";

export interface Oferta {
  tipo: "ASEGURADORA" | "LEGALISTAS";
  monto: number;
  fecha: string;
  aceptada?: boolean;
}

export interface Negotiation {
  id: number;
  causa: string;
  expediente: string;
  abogadoContraparte: string;
  abogadoInterno: string;
  lesion: string;
  incLegalistas: number | null;
  deArt: number | null;
  liquidacion100: number | null;
  liquidacion80: number | null;
  ofertas: Oferta[];
  estado: "ESPERANDO" | "EN_NEGOCIACION" | "FINALIZADA";
  lawyerId?: number | null; // ID del abogado asignado para filtrado por roles
}
