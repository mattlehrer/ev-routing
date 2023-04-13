/**
 * TODO:
 *
 * Construct the graph
 *
 * Use the method in
 * Huber, G., & Bogenberger, K. (2015). Long-Trip Optimization of Charging Strategies for Battery Electric Vehicles. Transportation Research Record: Journal of the Transportation Research Board, 2497, 45–53. doi:10.3141/2497-05
 * https://sci-hub.st/10.3141/2497-05
 *
 * For each CS, find the closest node on the route. These will be ai and bi.
 * Create nodes for each CS and battery level, 0-100%, every 10%.
 * These are ii, c0-100, and oi.
 * There are edges from ai to ii, ii to c0-100, c0-100 to oi, and oi to bi.
 * The costs of edges ii to c0-100 are based on the price of charging at the CS.
 * The costs of edges ai to ii and oi to bi are based on the distance between the CS and the node, assume 0 for now?
 * The costs of edges c0-100 are an overhead time cost (entering/leaving the vehicle, setting up payment, etc.)
 *
 */

import { featureCollection, point, type Position } from '@turf/helpers';
import nearestPoint from '@turf/nearest-point';
import newGraph from 'ngraph.graph';
import { calc_route_segment_battery_power_flow } from './battery_sim/route_segment_battery_consumption';
import type { ChargingStationBasic } from './charging_stations';
import type { convertRouteFromStepsToIntersections } from './route';
import { TestVehicle } from './vehicles/TestVehicle';

export function createGraphFromRouteAndChargingStations({
	intersections,
	stations,
	overheadDuration = 5 * 60, // 5 minutes
}: {
	intersections: ReturnType<typeof convertRouteFromStepsToIntersections>;
	stations: ChargingStationBasic[];
	overheadDuration?: number;
}) {
	const g = newGraph();

	//  add a node for the beginning of the route
	g.addNode('s');
	let previous = 's';
	let previousLonLat = intersections[0].intersection.location;

	const sortedStations = stations
		.map((station) => ({
			...station,
			closest: findClosestIntersectionOnRouteToChargingStation({ intersections, station }),
		}))
		.sort((a, b) => a.closest.properties.featureIndex - b.closest.properties.featureIndex);

	//  for each station,
	sortedStations.forEach((station, i) => {
		//  find the closest intersection on the route
		const closest = station.closest;

		//  add a node for that intersection - ai
		g.addNode(`a${i}`, { coordinates: closest.geometry.coordinates });

		// console.log({ closest, intersections });

		const statsFromPrevToA = cumulativeStatsAlongRoute({
			intersections,
			start: previousLonLat,
			end: closest.geometry.coordinates,
		});

		//  add an edge from the previous station to this intersection
		g.addLink(previous, `a${i}`, {
			distance: statsFromPrevToA.distance,
			duration: statsFromPrevToA.duration,
			power: statsFromPrevToA.power,
			financial: 0,
		});
		previous = `a${i}`;

		//  add a node for the station - ii
		g.addNode(`i${i}`, { station });

		// add an edge from intersection to station
		g.addLink(`a${i}`, `i${i}`, {
			distance: closest.properties.distanceToPoint, // as the crow flies, should compute a route
			duration: (closest.properties.distanceToPoint * 60 * 60) / 30000, // 30km/h
			// TODO: base on route
			power: calc_route_segment_battery_power_flow({
				vehicle: TestVehicle,
				distance: closest.properties.distanceToPoint,
				duration: (closest.properties.distanceToPoint * 60 * 60) / 30000,
				elevation_start: 0,
				elevation_end: 0,
				density_of_air: 1.225,
			}),
			financial: 0,
		});

		// add a node for oi that will have edges from all battery levels and back to the route
		g.addNode(`o${i}`);

		// TODO: factor in multiple outlets per station, different charging rates and prices
		for (let j = 10; j <= 100; j += 10) {
			const chargeLevel = `c${i}-${j}`;
			//  add a node for each battery level
			g.addNode(chargeLevel, { batteryLevel: j });

			//  add edges from the station to each battery level
			g.addLink(`i${i}`, chargeLevel, {
				distance: 0,
				duration: undefined, // TODO: will be calculated based on starting and ending SoC
				power: 0, // changes SoC but does not consume energy
				financial: undefined, // TODO: will be calculated based on starting and ending SoC
			});

			g.addLink(chargeLevel, `o${i}`, {
				distance: 0,
				duration: overheadDuration, // for entering/leaving the vehicle, setting up charging, etc.
				power: 0,
				financial: 0,
			});
		}

		// add a node for bi that has edges from ai and oi, same location as ai
		g.addNode(`b${i}`, { coordinates: closest.geometry.coordinates });

		g.addLink(`o${i}`, `b${i}`, {
			distance: closest.properties.distanceToPoint, // as the crow flies, should compute a route
			duration: (closest.properties.distanceToPoint * 60 * 60) / 30000, // TODO: figure out an estimate
			// TODO: base on route
			power: calc_route_segment_battery_power_flow({
				distance: closest.properties.distanceToPoint,
				duration: (closest.properties.distanceToPoint * 60 * 60) / 30000,
				elevation_start: 0,
				elevation_end: 0,
				vehicle: TestVehicle,
				density_of_air: 1.225,
			}),
			financial: 0,
		});

		g.addLink(`a${i}`, `b${i}`, {
			distance: 0,
			duration: 0,
			power: 0,
			financial: 0,
		});

		previous = `b${i}`;
		previousLonLat = closest.geometry.coordinates;
	});

	// add node for destination
	g.addNode('d');

	const statsFromPrevToA = cumulativeStatsAlongRoute({
		intersections,
		start: previousLonLat,
		end: intersections[intersections.length - 1].intersection.location,
	});

	// add edge to the destination from bn
	g.addLink(previous, 'd', {
		distance: statsFromPrevToA.distance,
		duration: statsFromPrevToA.duration,
		power: statsFromPrevToA.power,
		financial: 0,
	});

	return g;
}

export function findClosestIntersectionOnRouteToChargingStation({
	intersections,
	station,
}: {
	intersections: ReturnType<typeof convertRouteFromStepsToIntersections>;
	station: ChargingStationBasic;
}) {
	const { latitude, longitude } = station.location;
	const points = featureCollection(
		intersections.map((intersection) => point(intersection.intersection.location)),
	);

	const nearestPointToStation = nearestPoint([longitude, latitude], points);
	console.log({ nearestPointToStation, points });
	return nearestPointToStation;
}
// export function findClosestIntersectionOnRouteToChargingStation({
// 	route,
// 	station,
// }: {
// 	route: Route;
// 	station: ChargingStationBasic;
// }) {
// 	const { latitude, longitude } = station.location;
// 	const points = featureCollection(
// 		route.legs.flatMap((leg) =>
// 			leg.steps.flatMap((step) =>
// 				step.intersections.map((intersection) => point(intersection.location)),
// 			),
// 		),
// 	);
// 	// console.log(JSON.stringify(points, null, 2));

// 	const nearestPointToStation = nearestPoint([longitude, latitude], points);
// 	return nearestPointToStation;
// }

/**
 * Sum stats about a route between two positions.
 * @param route The route to search
 * @param start The start position
 * @param end The end position
 * @returns An object with the distance, in meters, duration, in s, and the power use, in Wh
 */
export function cumulativeStatsAlongRoute({
	intersections,
	start,
	end,
}: {
	intersections: ReturnType<typeof convertRouteFromStepsToIntersections>;
	start: Position;
	end: Position;
}): { distance: number; duration: number; power: number } {
	let distance = 0;
	let duration = 0;
	let power = 0;

	// console.log({ start, end });

	if (start[0] === end[0] && start[1] === end[1]) {
		return { distance, duration, power };
	}

	let isAfterStart = false;

	for (const intersection of intersections) {
		if (!isAfterStart) {
			//  if the intersection is the start position,
			if (
				intersection.intersection.location[0] === start[0] &&
				intersection.intersection.location[1] === start[1]
			) {
				//  set the flag to true
				isAfterStart = true;
				// step.distance is the distance to the next maneuver, so we need to start adding now
				distance += intersection.distance;
				duration += intersection.duration;
				power += intersection.power ? intersection.power : 0;
			}
		} else {
			//  if the intersection is the end position,
			if (
				intersection.intersection.location[0] === end[0] &&
				intersection.intersection.location[1] === end[1]
			) {
				// and break out of the loop and return the stats
				// break;
				return { distance, duration, power };
			} else {
				distance += intersection.distance;
				duration += intersection.duration;
				power += intersection.power ? intersection.power : 0;
			}
		}
	}

	if (!isAfterStart) {
		throw new Error('Start position not found on route');
	} else {
		throw new Error('End position not found on route');
	}
}
