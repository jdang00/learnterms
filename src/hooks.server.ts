import { withClerkHandler, clerkClient } from 'svelte-clerk/server';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const protectAdmin: Handle = async ({ event, resolve }) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/admin')) {
    const { userId } = event.locals.auth();
    if (!userId) throw redirect(307, '/sign-in');

    const user = await clerkClient.users.getUser(userId);
    const meta = user.publicMetadata as unknown as { plan?: string; role?: string; create?: string };
    const isAdmin = meta?.role === 'admin' || meta?.create === 'contributor';
    if (!isAdmin) throw redirect(307, '/');
  }
  return resolve(event);
};

export const handle = sequence(withClerkHandler(), protectAdmin);
