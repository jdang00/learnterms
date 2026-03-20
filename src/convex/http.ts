import { httpRouter } from 'convex/server';
import { polar } from './polar';

const http = httpRouter();

// Register Polar webhook routes at /polar/events
// The Polar component automatically stores subscriptions - no need to update plan field
// We check subscription status directly via getCurrentSubscription
polar.registerRoutes(http as any, {
	// Optional logging for debugging
	onSubscriptionCreated: async (_ctx, event) => {
		console.log('Subscription created:', {
			status: event.data.status,
			productId: event.data.productId
		});
	},
	onSubscriptionUpdated: async (_ctx, event) => {
		console.log('Subscription updated:', {
			status: event.data.status,
			cancelAtPeriodEnd: event.data.cancelAtPeriodEnd
		});
		if (event.data.customerCancellationReason) {
			console.log('Cancellation reason:', event.data.customerCancellationReason);
		}
	},
	onProductCreated: async (_ctx, event) => {
		console.log('Product created:', event.data.name);
	},
	onProductUpdated: async (_ctx, event) => {
		console.log('Product updated:', event.data.name);
	}
});

export default http;
