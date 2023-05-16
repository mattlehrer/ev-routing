import { getLonLatInSweden } from '$lib/sweden_geojson/random';
import { fail } from '@sveltejs/kit';
import calculateDistance from '@turf/distance';
import { isNumber } from '@turf/helpers';
import { Job, Queue, Worker } from 'bullmq';
import type { Actions } from './$types';

const connection = {
	host: 'localhost',
	port: 6379,
};

let worker: Worker<{ origin: number[]; destination: number[] }> | undefined = undefined;

export const actions = {
	default: async (event) => {
		const req = event.request;
		const data = await req.formData();
		const routes = data.get('routes') as string;
		if (!isNumber(routes) || Number(routes) < 0 || Number(routes) > 1200) {
			return fail(400, { routes, incorrect: true });
		}
		console.log({ input: Number(routes) });

		const myQueue = new Queue('routes', { connection });
		if (!worker) {
			worker = new Worker('routes', async (job: Job) => {
				// Optionally report some progress
				await job.updateProgress(42);
				const { origin, destination } = job.data;
				console.log('worker running');
				console.log({ origin, destination, priority: job.opts.priority });
				return { origin, destination };
			});
		}

		for (let i = 0; i < Number(routes); i++) {
			const origin = getLonLatInSweden();
			const destination = getLonLatInSweden();
			const distance = calculateDistance(origin, destination, { units: 'kilometers' });
			await myQueue.add('route', { origin, destination }, { priority: distance });
		}

		return { success: true };
	},
} satisfies Actions;
