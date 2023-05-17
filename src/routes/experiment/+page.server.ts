import {
	getChargingStationsAlongRoute,
	type ChargingStationAPIStation,
} from '$lib/charging_stations';
import {
	calcPowerForRouteWithVehicle,
	convertRouteFromStepsToIntersections,
	getRoute,
} from '$lib/route';
import {
	createGraphFromRouteAndChargingStations,
	findPathInGraphWithCostFunction,
} from '$lib/station_graph';
import { getLatLonInSweden } from '$lib/sweden_geojson/random';
import { TestVehicle } from '$lib/vehicles/TestVehicle';
import type OSRM from '@project-osrm/osrm';
import { fail } from '@sveltejs/kit';
import { isNumber } from '@turf/helpers';
import { Job, Queue, Worker } from 'bullmq';
import { uid } from 'uid';
import type { Actions } from './$types';

const connection = {
	host: 'localhost',
	port: 6379,
};

/**
 * for each job:
 * - run and save output from
 *		- getRoute
 *		- calcPowerForRouteWithVehicle
 *		- getChargingStationsAlongRoute
 *			- with cache - redis
 *		- createGraphFromRouteAndChargingStations
 *		- findPathInGraphWithCostFunction for financial cost
 *		- findPathInGraphWithCostFunction for duration
 *	- log results to sqlite db & csv? log file with columns for
 *		- start time of run: DateTime
 *		- completion time: DateTime
 *		- origin: json
 *		- destination: json
 *		- route: json
 *		- totalPower: number
 *		- graph: json
 *		- path for financial cost: json
 *		- optimized financial cost: number
 *		- & associated duration: number
 *		- path for duration: json
 *		- optimized duration: number
 *		- & associated financial cost: number
 */

const worker = new Worker<{
	origin: { latitude: number; longitude: number };
	destination: { latitude: number; longitude: number };
}>(
	'routes',
	async (job: Job) => {
		// Optionally report some progress
		const startTime = Date.now();
		const { origin, destination } = job.data;
		console.log('worker running');
		console.log({ origin, destination, priority: job.opts.priority });
		const route = await getRoute({
			origin: [origin.latitude, origin.longitude],
			destination: [destination.latitude, destination.longitude],
		});
		const { route: routeWithPower, totalPower } = calcPowerForRouteWithVehicle(route);

		const chargingStations = await getChargingStationsAlongRoute({
			origin: [origin.latitude, origin.longitude],
			destination: [destination.latitude, destination.longitude],
			getPricing: true,
		});

		const minimumCapacity = 22;
		const g = await createGraphFromRouteAndChargingStations({
			intersections: convertRouteFromStepsToIntersections(routeWithPower),
			stations: chargingStations.stations,
			minimumCapacity,
		});

		const stations: ChargingStationAPIStation[] =
			chargingStations.stations as unknown as ChargingStationAPIStation[];

		const nodeCount = g.getNodesCount();
		const edgeCount = g.getLinksCount();
		const originalOutletCount = stations.reduce(
			(acc: number, s: ChargingStationAPIStation) => acc + s.outletList.reduce((l, _) => l + 1, 0),
			0,
		);
		const outletCount = stations.reduce(
			(acc: number, s: ChargingStationAPIStation) =>
				acc +
				s.outletList.reduce(
					(l, o) => l + (o.capacity >= minimumCapacity && (o.costKwh || o.costMin) ? 1 : 0),
					0,
				),
			0,
		);

		console.log(
			`graph has ${nodeCount} nodes, ${edgeCount} edges, and ${outletCount} outlets from ${originalOutletCount} original outlets`,
		);

		let type = 'cumulativeFinancialCost' as 'cumulativeDuration' | 'cumulativeFinancialCost';
		const financialCostId = uid();
		console.log(`finding ${type} path - ${financialCostId}`);
		console.time(`path for ${type} ${financialCostId}`);
		const financialCostPath = findPathInGraphWithCostFunction({
			g,
			type,
			initialSoC: TestVehicle.battery_capacity * 0.95,
		});
		console.timeEnd(`path for ${type} ${financialCostId}`);

		type = 'cumulativeDuration';
		const durationId = uid();
		console.log(`finding ${type} path - ${durationId}`);
		console.time(`path for ${type} ${durationId}`);
		const durationPath = findPathInGraphWithCostFunction({
			g,
			type,
			initialSoC: TestVehicle.battery_capacity * 0.95,
		});
		console.timeEnd(`path for ${type} ${durationId}`);
		const endTime = Date.now();

		return {
			startTime,
			origin,
			destination,
			route,
			totalPower,
			chargingStations,
			graph: g,
			financialCostPath,
			optimizedCost: financialCostPath
				? financialCostPath[financialCostPath.length - 1].cumulativeFinancialCost
				: null,
			optimizedCostDuration: financialCostPath
				? financialCostPath[financialCostPath.length - 1].cumulativeDuration
				: null,
			durationPath,
			optimizedDuration: durationPath
				? durationPath[durationPath.length - 1].cumulativeDuration
				: null,
			optimizedDurationFinancialCost: durationPath
				? durationPath[durationPath.length - 1].cumulativeFinancialCost
				: null,
			endTime,
		};
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
			// const distance = calculateDistance(
			// 	[origin.longitude, origin.latitude],
			// 	[destination.longitude, destination.latitude],
			// 	{ units: 'kilometers' },
			// );
			await myQueue.add('route', { origin, destination });
		}

		return { success: true };
	},
} satisfies Actions;
