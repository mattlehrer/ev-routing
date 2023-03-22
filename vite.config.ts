import { sveltekit } from '@sveltejs/kit/vite';
import { isoImport } from 'vite-plugin-iso-import';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [isoImport(), sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
