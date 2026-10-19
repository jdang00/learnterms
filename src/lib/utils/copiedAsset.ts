import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';

/** Files vite-plugin-static-copy adds at build time aren't in static/, so not in AssetPath. */
export const copiedAsset = (path: string) => asset(path as AssetPath);
