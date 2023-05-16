import { getRoute } from '$lib/route';
import { getLatLonInSweden } from '$lib/sweden_geojson/random';
import type OSRM from '@project-osrm/osrm';
import { fail } from '@sveltejs/kit';
import calculateDistance from '@turf/distance';
import { isNumber } from '@turf/helpers';
import { Job, Queue, Worker } from 'bullmq';
import type { Actions } from './$types';

const connection = {
	host: 'localhost',
	port: 6379,
};

const worker = new Worker<{
	origin: { latitude: number; longitude: number };
	destination: { latitude: number; longitude: number };
}>(
	'routes',
	async (job: Job) => {
		// Optionally report some progress
		await job.updateProgress(42);
		const { origin, destination } = job.data;
		console.log('worker running');
		console.log({ origin, destination, priority: job.opts.priority });
		const route = await getRoute({
			origin: [origin.latitude, origin.longitude],
			destination: [destination.latitude, destination.longitude],
		});
		return { origin, destination, route };
	},
	{ connection },
);

worker.on(
	'completed',
	(job: Job, returnvalue: { origin: number[]; destination: number[]; route: OSRM.Route }) => {
		// Do something with the return value.
		const { route, origin, destination } = returnvalue;
		console.log({ origin, destination, route: route.distance });
	},
);

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

		for (let i = 0; i < Number(routes); i++) {
			const origin = getLatLonInSweden();
			const destination = getLatLonInSweden();
			const distance = calculateDistance(
				[origin.longitude, origin.latitude],
				[destination.longitude, destination.latitude],
				{ units: 'kilometers' },
			);
			await myQueue.add('route', { origin, destination }, { priority: distance });
		}

		return { success: true };
	},
} satisfies Actions;
