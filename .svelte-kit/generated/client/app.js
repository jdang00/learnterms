import * as client_hooks from '../../../src/hooks.client.ts';


export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12')
];

export const server_loads = [];

export const dictionary = {
		"/": [~2],
		"/about": [3],
		"/blog": [4],
		"/blog/LENS": [5],
		"/blog/LearnTerms 1.0": [6],
		"/changelog": [7],
		"/pharm": [8],
		"/pharm/chapter/[slug]": [~9],
		"/sign-in": [10],
		"/sign-up": [11],
		"/student-of-the-week": [12]
	};

export const hooks = {
	handleError: client_hooks.handleError || (({ error }) => { console.error(error) }),
	init: client_hooks.init,
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';