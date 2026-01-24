export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
	id: number;
	message: string;
	type: ToastType;
};

let nextId = 0;

class ToastStore {
	toasts: Toast[] = $state([]);

	add(message: string, type: ToastType = 'success', duration = 3000) {
		const id = nextId++;
		this.toasts = [...this.toasts, { id, message, type }];
		setTimeout(() => this.remove(id), duration);
	}

	remove(id: number) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
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
}

export const toastStore = new ToastStore();
