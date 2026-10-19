import { toast } from 'svelte-sonner';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Thin facade over svelte-sonner so existing call sites keep working. For actions, promises or
// descriptions, import `toast` from 'svelte-sonner' directly.
class ToastStore {
	add(message: string, type: ToastType = 'success', duration = 3000) {
		toast[type](message, { duration });
	}

	success(message: string) {
		this.add(message, 'success');
	}

	error(message: string) {
		this.add(message, 'error', 5000);
	}

	info(message: string) {
		this.add(message, 'info');
	}

	warning(message: string) {
		this.add(message, 'warning', 4000);
	}
}

export const toastStore = new ToastStore();
