export interface SalesStatsCard {
	oportunidadesCreadas: number;
	oportunidadesGanadas: number;
	oportunidadesPerdidas: number;
	tasaConversion: number;
	tendenciaCreadas: number;
	tendenciaGanadas: number;
	tendenciaPerdidas: number;
	tendenciaConversion: number;
}

export interface ChartDataItem {
	name: string;
	value: number;
}

export interface MonthlyChartItem {
	month: string;
	ganadas: number;
	perdidas: number;
}

export interface WonLeadPerson {
	nombreCompleto: string;
	email: string;
	vendedor: string;
	servicio: string;
	fecha: string;
}

export interface SalesFiltersState {
	startDate: string;
	endDate: string;
	sellerId: string;
	internalLawyerId: string;
	responsibleLawyerId: string;
	sourceChannelId: string;
	servicesId: string;
	stateId: string;
	city: string;
}

export interface SalesStatsResponse {
	statsCard: SalesStatsCard;
	monthlyLeadsData: MonthlyChartItem[];
	channelLeadsData: ChartDataItem[];
	salesBySellerData: ChartDataItem[];
	salesByLocationData: ChartDataItem[];
	leadsGanadasPersonas: WonLeadPerson[];
}

export interface FilterOption {
	id: number | string;
	name: string;
}
