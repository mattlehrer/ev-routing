import OSRM from '@project-osrm/osrm';
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
}): Promise<Route> {
	return new Promise((resolve, reject) => {
		console.log({ data });
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

export function convertRouteFromStepsToIntersections(route: Route) {
	const modRoute = [];
	for (const leg of route.legs) {
		let i = 0;
		for (const step of leg.steps) {
			for (const intersection of step.intersections) {
				modRoute.push({
					intersection,
					distance: leg.annotation.distance[i],
					duration: leg.annotation.duration[i],
					power: calc_route_segment_battery_power_flow({
						distance: leg.annotation.distance[i],
						duration: leg.annotation.duration[i],
						elevation_start: 0,
						elevation_end: 0,
						vehicle: TestVehicle,
						density_of_air: 1.225,
					}),
					cost: 0,
				});
				i++;
			}
		}
	}

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
