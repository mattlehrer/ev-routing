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
import { fail } from '@sveltejs/kit';
import { isNumber } from '@turf/helpers';
import Database from 'better-sqlite3';
import { Job, Queue, Worker } from 'bullmq';
import { uid } from 'uid';
import type { Actions } from './$types';

const db = new Database('results.db', { verbose: console.log });
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS routes (
	id TEXT PRIMARY KEY,
  startTime DATETIME,
  origin BLOB,
  destination BLOB,
  route BLOB,
  totalPower FLOAT,
  chargingStations BLOB,
  graph BLOB,
  financialCostPath BLOB,
  optimizedCost FLOAT,
  optimizedCostDuration FLOAT,
  durationPath BLOB,
  optimizedDuration FLOAT,
  optimizedDurationFinancialCost FLOAT,
  endTime DATETIME
);
`);
const init = db.prepare(
	`INSERT INTO routes (id, startTime, origin, destination, route, totalPower) VALUES (?, ?, ?, ?, ?, ?)`,
);

const addStations = db.prepare(`UPDATE routes set chargingStations = ? WHERE id = ?`);
const addGraph = db.prepare(`UPDATE routes set graph = ? WHERE id = ?`);
const addFinancialCostData = db.prepare(
	`UPDATE routes set financialCostPath = ?, optimizedCost = ?, optimizedCostDuration = ? WHERE id = ?`,
);
const addDurationData = db.prepare(
	`UPDATE routes set durationPath = ?, optimizedDuration = ?, optimizedDurationFinancialCost = ? WHERE id = ?`,
);
const addEndTime = db.prepare(`UPDATE routes set endTime = ? WHERE id = ?`);

const connection = {
	host: 'localhost',
	port: 6379,
};

const myQueue = new Queue('routes', { connection });

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
		const jobId = uid();
		console.log(`worker running ${jobId}`);

		const startTime = Date.now();
		const { origin, destination } = job.data;

		console.log({ origin, destination });
		const route = await getRoute({
			origin: [origin.latitude, origin.longitude],
			destination: [destination.latitude, destination.longitude],
		});
		const { route: routeWithPower, totalPower } = calcPowerForRouteWithVehicle(route);
		console.log({ distance: route.distance, totalPower });

		let info = init.run(
			jobId,
			startTime,
			JSON.stringify(origin),
			JSON.stringify(destination),
			JSON.stringify(route),
			totalPower,
		);
		console.log({ info });

		const chargingStations = await getChargingStationsAlongRoute({
			origin: [origin.latitude, origin.longitude],
			destination: [destination.latitude, destination.longitude],
			getPricing: true,
		});
		const stations: ChargingStationAPIStation[] =
			chargingStations.stations as unknown as ChargingStationAPIStation[];

		info = addStations.run(JSON.stringify(chargingStations), jobId);
		console.log({ info });

		const minimumCapacity = 22;
		const g = await createGraphFromRouteAndChargingStations({
			intersections: convertRouteFromStepsToIntersections(routeWithPower),
			stations: chargingStations.stations,
			minimumCapacity,
		});

		info = addGraph.run(g, jobId);
		console.log({ info });

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

		info = addFinancialCostData.run(
			JSON.stringify(financialCostPath),
			financialCostPath
				? JSON.stringify(financialCostPath[financialCostPath.length - 1].cumulativeFinancialCost)
				: null,
			financialCostPath
				? JSON.stringify(financialCostPath[financialCostPath.length - 1].cumulativeDuration)
				: null,
			jobId,
		);
		console.log({ info });

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

		info = addDurationData.run(
			JSON.stringify(durationPath),
			durationPath
				? JSON.stringify(durationPath[durationPath.length - 1].cumulativeDuration)
				: null,
			durationPath
				? JSON.stringify(durationPath[durationPath.length - 1].cumulativeFinancialCost)
				: null,
			jobId,
		);
		console.log({ info });

		const endTime = Date.now();

		info = addEndTime.run(endTime, jobId);

		const results = {
			jobId,
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

		return results;
	},
	{ connection },
);

worker.on(
	'completed',
	(
		job: Job,
		returnvalue: {
			jobId: string;
			origin: number[];
			destination: number[];
			optimizedCost: number;
			optimizedCostDuration: number;
			optimizedDuration: number;
			optimizedDurationFinancialCost: number;
		},
	) => {
		const {
			jobId,
			origin,
			destination,
			optimizedCost,
			optimizedCostDuration,
			optimizedDuration,
			optimizedDurationFinancialCost,
		} = returnvalue;
		console.log({
			jobId,
			origin,
			destination,
			optimizedCost,
			optimizedCostDuration,
			optimizedDuration,
			optimizedDurationFinancialCost,
		});
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
