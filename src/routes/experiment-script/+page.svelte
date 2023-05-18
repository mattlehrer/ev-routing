<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	export let form: ActionData;
</script>

<main class="max-w-lg p-8 sm:p-24">
	<h1 class="text-4xl">Experiment Setup</h1>

	<form class="mt-8" method="POST" use:enhance>
		{#if form?.success}
			<p class="text-xl text-green-700">Jobs running!</p>
		{/if}
		{#if form?.incorrect}<p class="text-red-600">Routes to run must be a number</p>{/if}
		<div>
			<label for="email" class="block text-sm font-medium leading-6 text-gray-900"
				>Routes to run</label
			>
			<div class="mt-2">
				<input
					type="text"
					name="routes"
					id="routes"
					class="block w-full rounded-md border-0 py-1.5 text-right text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
					placeholder="5"
				/>
			</div>
		</div>
		<button
			type="submit"
			class="mt-4 inline-flex w-full items-center justify-center gap-x-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
		>
			Run 'em
			<svg class="-mr-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	</form>
</main>
