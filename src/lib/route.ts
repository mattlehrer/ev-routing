import OSRM from '@project-osrm/osrm';
import compare from 'just-compare';
import { calc_route_segment_battery_power_flow } from './battery_sim/route_segment_battery_consumption';
import { TestVehicle } from './vehicles/TestVehicle';
const osrm = new OSRM({ path: 'osrmdata/sweden-latest.osrm', algorithm: 'MLD' });

/**
 * generate a road route from origin to destination
 * @param data: { origin: [number, number], destination: [number, number] } both in the form [lat, lon]
 * @returns OSRM route
 */
export function getRoute(data: {
	origin: [number, number];
	destination: [number, number];
}): Promise<OSRM.Route> {
	return new Promise((resolve, reject) => {
		// console.log({ data });
		const [olat, olon] = data.origin;
		const [dlat, dlon] = data.destination;
		osrm.route(
			{
				coordinates: [
					// data is received as lat/lon but OSRM needs lon/lat
					[olon, olat],
					[dlon, dlat],
				],
				steps: true,
				overview: 'full',
				annotations: true,
				geometries: 'geojson',
			},
			(err, result) => {
				if (err) {
					console.error(err);
					reject(err);
				} else {
					// console.log(JSON.stringify(result, null, 2));
					resolve(result?.routes[0]);
				}
			},
		);
	});
}

export function convertRouteFromStepsToIntersections(route: OSRM.Route) {
	console.log({ route });
	// sum up the distance and duration of each step to get the total distance and duration of the route
	// let distance = 0;
	// let duration = 0;
	// for (const leg of route.legs) {
	// 	distance += leg.distance;
	// 	duration += leg.duration;
	// }

	const modRoute = [];
	let curr = 0;
	let prevDistance = 0;
	let prevDuration = 0;
	let currDistance = 0;
	let currDuration = 0;
	for (const leg of route.legs) {
		for (const step of leg.steps) {
			console.log({ step });
			for (const intersection of step.intersections) {
				console.log({ intersection });
				while (
					!compare(route.geometry.coordinates[curr], intersection.location) &&
					curr < route.geometry.coordinates.length
				) {
					if (curr > 0) {
						currDistance += leg.annotation.distance[curr - 1];
						currDuration += leg.annotation.duration[curr - 1];
					}
					console.log({ curr, currDistance, currDuration });
					curr++;
				}
				if (!compare(route.geometry.coordinates[curr], intersection.location)) {
					throw new Error("Couldn't find intersection in route.geometry.coordinates");
				} else if (curr > 0) {
					currDistance += leg.annotation.distance[curr - 1];
					currDuration += leg.annotation.duration[curr - 1];
				}
				modRoute.push({
					intersection,
					distance: currDistance - prevDistance,
					duration: currDuration - prevDuration,
					power: calc_route_segment_battery_power_flow({
						distance: currDistance - prevDistance,
						duration: currDuration - prevDuration,
						elevation_start: 0,
						elevation_end: 0,
						vehicle: TestVehicle,
						density_of_air: 1.225,
					}),
					cost: 0,
				});

				prevDistance = currDistance;
				prevDuration = currDuration;
			}
			curr++;
		}
	}

	// sum up the distance and duration for the modRoute
	let modDistance = 0;
	let modDuration = 0;
	for (const segment of modRoute) {
		modDistance += segment.distance;
		modDuration += segment.duration;
	}

	console.log({ modDistance, modDuration });

	return modRoute;
}

export function calcPowerForRouteWithVehicle(route: Route, vehicle = TestVehicle) {
	const modRoute: Route = {
		...route,
		legs: route.legs.map((leg) => ({
			...leg,
			steps: leg.steps.map((step) => ({
				...step,
				power: calc_route_segment_battery_power_flow({
					distance: step.distance,
					duration: step.duration,
					elevation_start: 0,
					elevation_end: 0,
					vehicle,
					density_of_air: 1.225,
				}),
			})),
		})),
	};

	const totalPower = modRoute.legs.reduce((routeTotal, leg) => {
		return (
			routeTotal +
			leg.steps.reduce((legTotal, step) => {
				return legTotal + (step.power ? step.power : 0);
			}, 0)
		);
	}, 0);

	return {
		route: modRoute,
		totalPower,
	};
}

export interface Route extends OSRM.Route {
	legs: RouteLeg[];
}

export interface RouteLeg extends OSRM.RouteLeg {
	steps: RouteStep[];
}

export interface RouteStep extends OSRM.RouteStep {
	intersections: Intersection[];
	power?: number;
}

export interface Intersection extends OSRM.Intersection {
	power?: number;
}
