import { calculate, type CalculationRequest } from './engine';

self.onmessage = ({
	data: { id, ...request }
}: MessageEvent<CalculationRequest & { id: number }>) => {
	try {
		self.postMessage({ id, result: calculate(request) });
	} catch (error) {
		self.postMessage({
			id,
			error: error instanceof Error ? error.message : 'Could not calculate this expression.'
		});
	}
};
