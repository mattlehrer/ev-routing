/**
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

import type { Coordinate } from '@project-osrm/osrm';
import { featureCollection, point, type Position } from '@turf/helpers';
import nearestPoint from '@turf/nearest-point';
import Heap from 'heap-js';
import type { Link } from 'ngraph.graph';
import newGraph from 'ngraph.graph';
import type { ChargingStationBasic, getPricingForChargingStations } from './charging_stations';
import {
	calcPowerForRouteWithVehicle,
	getRoute,
	type convertRouteFromStepsToIntersections,
} from './route';
import { TestVehicle } from './vehicles/TestVehicle';

export function findPathInGraphWithCostFunction({
	g,
	type,
	initialSoC,
	s = 's',
	d = 'd',
	minSoC = 0.1 * TestVehicle.battery_capacity,
}: {
	g: Awaited<ReturnType<typeof createGraphFromRouteAndChargingStations>>;
	type: 'cumulativeDuration' | 'cumulativePower' | 'cumulativeFinancialCost' | 'cumulativeDistance';
	initialSoC: number;
	s?: string;
	d?: string;
	minSoC?: number;
}) {
	const lTemp = new Heap<NodeLabel>((a, b) => a[type] - b[type]); // opened nodes
	const lPerm = new Heap<NodeLabel>((a, b) => a[type] - b[type]); // closed nodes

	lTemp.add({
		currentNode: s,
		cumulativeDuration: 0,
		cumulativePower: 0,
		cumulativeFinancialCost: 0,
		cumulativeDistance: 0,
		precedingNode: null,
		prevLabelIndex: 0,
		currentLabelIndex: 0,
	});
	let lCurrent: NodeLabel | undefined = undefined;
	while (lTemp.size() > 0) {
		lCurrent = lTemp.pop();
		if (!lCurrent) throw new Error('lCurrent is undefined');
		lPerm.add(lCurrent);
		// for all outgoing edges of lCurrent.currentNode
		g.forEachLinkedNode(
			lCurrent.currentNode,
			(node, link) => {
				const edge = link.data;
				if (!edge) throw new Error('edge is undefined');
				if (!lCurrent) throw new Error('lCurrent is undefined');
				const newCumulativeDuration = lCurrent.cumulativeDuration + edge.duration;

				// TODO: calculate the change in power for this edge
				let edgePower = 0;
				if (['a', 'i'].includes(node.data.type)) {
					edgePower = edge.power;
				}
				const newCumulativePower = Math.min(
					TestVehicle.battery_capacity,
					lCurrent.cumulativePower + edgePower,
				);

				// TODO: calculate the change in financial cost for this edge
				const newCumulativeFinancialCost = lCurrent.cumulativeFinancialCost + edge.financial;
				const newCumulativeDistance = lCurrent.cumulativeDistance + edge.distance;

				const newLabel = {
					currentNode: String(node.id),
					cumulativeDuration: newCumulativeDuration,
					cumulativePower: newCumulativePower,
					cumulativeFinancialCost: newCumulativeFinancialCost,
					cumulativeDistance: newCumulativeDistance,
					precedingNode: lCurrent.currentNode,
					prevLabelIndex: lCurrent.currentLabelIndex,
					currentLabelIndex: lCurrent.currentLabelIndex + 1,
				};

				if (initialSoC - newCumulativePower >= minSoC) {
					lTemp.add(newLabel);
				}
			},
			true, // only outgoing edges
		);
	}

	if (lCurrent?.currentNode === d) {
		return lCurrent;
	} else {
		// “No feasible solution found.”
		return null;
	}
}

/**
 * Create a graph data structure from a route and a list of charging stations.
 * @param intersections the intersections along the route
 * @param stations the list of charging stations
 * @param overheadDuration the time it takes to enter/exit the vehicle, set up payment, etc.
 * @returns a Promise of the constructed graph
 */
export async function createGraphFromRouteAndChargingStations({
	intersections,
	stations,
	overheadDuration = 5 * 60, // 5 minutes
}: {
	intersections: ReturnType<typeof convertRouteFromStepsToIntersections>;
	stations: Awaited<ReturnType<typeof getPricingForChargingStations>>;
	overheadDuration?: number;
}) {
	const g = newGraph<NodeType>();

	//  add a node for the beginning of the route
	g.addNode('s');
	let previous = 's';
	let previousLonLat = intersections[0].intersection.location;

	const sortedStations = stations
		.map((station) => ({
			...station,
			closestIntersection: findClosestIntersectionOnRouteToChargingStation({
				intersections,
				station,
			}),
		}))
		.sort(
			(a, b) =>
				a.closestIntersection.properties.featureIndex -
				b.closestIntersection.properties.featureIndex,
		);

	//  for each station,
	for (const [i, station] of sortedStations.entries()) {
		if (!station.outletList || !station.outletList.length) continue;

		//  use the closest intersection on the route
		const { closestIntersection } = station;

		//  add a node for that intersection - ai
		g.addNode(`a${i}`, { type: 'a', coordinates: closestIntersection.geometry.coordinates });

		// console.log({ closest, intersections });

		const statsFromPrevToA = cumulativeStatsAlongRoute({
			intersections,
			start: previousLonLat,
			end: closestIntersection.geometry.coordinates,
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
		g.addNode(`i${i}`, { type: 'i', station: station.slug });

		let route = await getRoute({
			origin: closestIntersection.geometry.coordinates as [number, number],
			destination: [station.location.latitude, station.location.longitude],
		});
		let { totalPower } = calcPowerForRouteWithVehicle(route);

		// add an edge from intersection to station
		g.addLink(`a${i}`, `i${i}`, {
			distance: route.distance,
			duration: route.duration,
			power: totalPower,
			financial: 0,
		});

		// add a node for oi that will have edges from all battery levels and back to the route
		g.addNode(`o${i}`);

		for (const outletType of station.outletList) {
			for (let j = 10; j <= 100; j += 10) {
				const chargeLevel = `c${i}-${j}-${outletType.capacity}`;
				//  add a node for each charge level
				g.addNode(chargeLevel, {
					type: 'c',
					chargeLevel: j,
					// TODO: implement cost per minute in types and cost function
					cost: outletType.costKwh,
					// costKwh: outletType.costKwh,
					// costPerMin: outletType.costPerMin,
					current: outletType.capacity,
				});

				//  add edges from the station to each battery level
				g.addLink(`i${i}`, chargeLevel, {
					distance: 0,
					duration: undefined, // will be calculated based on starting and ending SoC
					power: 0, // changes SoC but does not consume energy
					financial: undefined, // will be calculated based on starting and ending SoC
				});

				g.addLink(chargeLevel, `o${i}`, {
					distance: 0,
					duration: overheadDuration, // for entering/leaving the vehicle, setting up charging, etc.
					power: 0,
					financial: 0,
				});
			}
		}

		// add a node for bi that has edges from ai and oi, same location as ai
		g.addNode(`b${i}`, { type: 'b', coordinates: closestIntersection.geometry.coordinates });

		route = await getRoute({
			origin: closestIntersection.geometry.coordinates as [number, number],
			destination: [station.location.latitude, station.location.longitude],
		});
		({ totalPower } = calcPowerForRouteWithVehicle(route));

		g.addLink(`o${i}`, `b${i}`, {
			distance: route.distance,
			duration: route.duration,
			power: totalPower,
			financial: 0,
		});

		g.addLink(`a${i}`, `b${i}`, {
			distance: 0,
			duration: 0,
			power: 0,
			financial: 0,
		});

		previous = `b${i}`;
		previousLonLat = closestIntersection.geometry.coordinates;
	}

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

	// const json = toJson(g);
	// console.log({ graph: json });

	return g;
}

/**
 * Find the closest intersection from a list of intersections to a charging station.
 * @param intersections a list of intersections with LatLng coordinates
 * @param station a charging station with LatLng coordinates
 * @returns the intersection closest to the station
 */
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
	return nearestPointToStation;
}

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

type NodeLabel = {
	cumulativeDuration: number;
	cumulativePower: number;
	cumulativeFinancialCost: number;
	cumulativeDistance: number;
	precedingNode: string | null;
	prevLabelIndex: number; // "which of the labels belonging to the preceding node is relevant for getting the currently considered label"
	currentNode: string;
	currentLabelIndex: number;
};

type NodeType =
	| {
			type: 's' | 'd' | 'a' | 'b';
			coordinates: Coordinate;
	  }
	| {
			type: 'i';
			station: string;
	  }
	| {
			type: 'c';
			chargeLevel: number;
			cost: number;
			current: number;
	  }
	| {
			type: 'o';
	  };

type ArrayElement<ArrayType extends readonly unknown[]> =
	ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
type IntersectionWithStats = ArrayElement<ReturnType<typeof convertRouteFromStepsToIntersections>>;

type Edge = Link<{
	distance: number;
	duration: number;
	power: number;
	cost: number;
}>;
