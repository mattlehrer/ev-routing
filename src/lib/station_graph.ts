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

import { featureCollection, point } from '@turf/helpers';
import nearestPoint from '@turf/nearest-point';
import newGraph from 'ngraph.graph';
import type { ChargingStationBasic } from './charging_stations';
import type { Route } from './route';

function createGraphFromRouteAndChargingStations({
	route,
	stations,
}: {
	route: Route;
	stations: ChargingStationBasic[];
}) {
	const g = newGraph();

	//  add a node for the beginning of the route
	g.addNode('s');
	let previous = 's';

	//  for each station,
	stations.forEach((station, i) => {
		//  find the closest intersection on the route
		const closest = findClosestIntersectionOnRouteToChargingStation({ route, station });

		//  add a node for that intersection - ai
		g.addNode(`a${i}`, { coordinates: closest.geometry.coordinates });

		//  add an edge from the previous station to this intersection
		g.addLink(previous, `a${i}`, {
			distance: 0, // TODO: sum of distances to intersection in route data
			duration: 0, // TODO: sum of durations to intersection in route data
			energy: 0, // TODO: sum of energy use to intersection in route data
			financial: 0,
		});
		previous = `a${i}`;

		//  add a node for the station - ii
		g.addNode(`i${i}`, { station });

		// add an edge from intersection to station
		g.addLink(`a${i}`, `i${i}`, {
			distance: closest.properties.distanceToPoint, // as the crow flies, should compute a route
			duration: (closest.properties.distanceToPoint * 60 * 60) / 30000, // TODO: figure out an estimate
			energy: 0, // TODO: base on route
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
				energy: 0, // changes SoC but does not consume energy
				financial: undefined, // TODO: will be calculated based on starting and ending SoC
			});

			g.addLink(chargeLevel, `o${i}`, {
				distance: 0,
				duration: 5 * 60, // five minutes for entering/leaving the vehicle, setting up charging, etc.
				energy: 0,
				financial: 0,
			});
		}

		// add a node for bi that has edges from ai and oi, same location as ai
		g.addNode(`b${i}`, { coordinates: closest.geometry.coordinates });

		g.addLink(`o${i}`, `b${i}`, {
			distance: 0,
			duration: 5 * 60, // five minutes for entering/leaving the vehicle, setting up charging, etc.
			energy: 0,
			financial: 0,
		});

		g.addLink(`a${i}`, `b${i}`, {
			distance: 0,
			duration: 0,
			energy: 0,
			financial: 0,
		});

		previous = `b${i}`;
	});

	// add node for destination
	g.addNode('d');

	// add edge to the destination from bn
	g.addLink(previous, 'd');

	return g;
}

export function findClosestIntersectionOnRouteToChargingStation({
	route,
	station,
}: {
	route: Route;
	station: ChargingStationBasic;
}) {
	const { latitude, longitude } = station.location;
	const points = featureCollection(
		route.legs.flatMap((leg) =>
			leg.steps.flatMap((step) =>
				step.intersections.map((intersection) => point(intersection.location)),
			),
		),
	);
	console.log(JSON.stringify(points, null, 2));

	const nearestPointToStation = nearestPoint([longitude, latitude], points);
	return nearestPointToStation;
}
