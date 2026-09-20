export interface CostReservation {
	reservedUsd: number;
	actualUsd?: number;
	status?: string;
}

export interface ModelReservation extends CostReservation {
	doc: string;
	thinking: string;
	stage: string;
	maxOutputTokens: number;
	at: string;
}

export interface OcrReservation extends CostReservation {
	hash: string;
	name: string;
	pages: number;
	at: string;
}

export interface EvaluationDocument {
	name: string;
	hash: string;
	pages: number;
}
