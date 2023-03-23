// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

declare module 'svelte-leafletjs?client' {
	import * as all from 'svelte-leafletjs';
	export = all;
}

declare module '*?client';
declare module '*?server';

export {};
