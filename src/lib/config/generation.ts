export type ModelId = 'gemini-3-pro-preview' | 'gemini-3-flash-preview';
export type Focus = 'optometry' | 'pharmacy' | 'general';

export type ProductModelId = 'swift-general' | 'swift-optometry' | 'swift-pharmacy';

type ProductModel = {
	label: string;
	model: ModelId;
	focus: Focus;
};

export const productModels: Record<ProductModelId, ProductModel> = {
	'swift-general': { label: 'swift-general', model: 'gemini-3-flash-preview', focus: 'general' },
	'swift-optometry': { label: 'swift-optometry', model: 'gemini-3-flash-preview', focus: 'optometry' },
	'swift-pharmacy': { label: 'swift-pharmacy', model: 'gemini-3-flash-preview', focus: 'pharmacy' }
};

export const defaultProductModelId: ProductModelId = 'swift-general';

export const productModelOptions: { value: ProductModelId; label: string }[] = (
	Object.keys(productModels) as ProductModelId[]
).map((k) => ({ value: k, label: productModels[k].label }));

export function resolveProduct(
	input?: string
): { productId: ProductModelId; model: ModelId; focus: Focus; label: string } {
	const id = (input as ProductModelId) || defaultProductModelId;
	const mapped = productModels[id] ?? productModels[defaultProductModelId];
	return { productId: id in productModels ? (id as ProductModelId) : defaultProductModelId, model: mapped.model, focus: mapped.focus, label: mapped.label };
}


