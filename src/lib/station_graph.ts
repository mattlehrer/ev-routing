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
import { Heap } from 'heap-js';
import compare from 'just-compare';
import newGraph from 'ngraph.graph';
import toJson from 'ngraph.tojson';
import { uid } from 'uid';
import type { ChargingStationBasic, getPricingForChargingStations } from './charging_stations';
import {
	calcPowerForRouteWithVehicle,
	getRoute,
	type convertRouteFromStepsToIntersections,
} from './route';
import { TestVehicle } from './vehicles/TestVehicle';

/**
 * Find a path through the road network graph optimizing for duration or financial cost
 * @param g the graph
 * @param type the type of cost function to optimize for
 * @param initialSoC the initial state of charge of the vehicle, in kWh
 * @param s the starting node
 * @param d the destination node
 * @param minSoC the minimum state of charge to allow, in kWh
 * @param batteryCapacity the battery capacity of the vehicle, in kWh
 * @returns the path
 */
export function findPathInGraphWithCostFunction({
	g,
	type,
	initialSoC,
	s = 's',
	d = 'd',
	minSoC = 0.1 * TestVehicle.battery_capacity,
	batteryCapacity = TestVehicle.battery_capacity,
	fastMode = false,
}: {
	g: Awaited<ReturnType<typeof createGraphFromRouteAndChargingStations>>;
	type: 'cumulativeDuration' | 'cumulativeFinancialCost';
	initialSoC: number;
	s?: string;
	d?: string;
	minSoC?: number;
	batteryCapacity?: number;
	fastMode?: boolean;
}) {
	const lTemp =
		type === 'cumulativeFinancialCost'
			? new Heap<NodeLabel>(financialCostComparator)
			: new Heap<NodeLabel>((a, b) => a[type] - b[type]); // opened nodes
	const lPerm =
		type === 'cumulativeFinancialCost'
			? new Heap<NodeLabel>(financialCostComparator)
			: new Heap<NodeLabel>((a, b) => a[type] - b[type]); // closed nodes

	let hasReachedDestination = false;

	lTemp.add({
		cumulativeDuration: 0,
		cumulativeDistance: 0,
		cumulativePower: 0,
		cumulativeFinancialCost: 0,
		chargingDuration: 0,
		chargingKw: 0,
		chargingStops: 0,
		precedingNode: null,
		prevLabelIndex: '',
		currentNode: s,
		currentLabelIndex: uid(),
	});
	let lCurrent: NodeLabel | undefined = undefined;

	// line 1 from Huber 2015 Algorithm A
	while (lTemp.size() > 0 && !hasReachedDestination) {
		// lines 2 & 3
		lCurrent = lTemp.pop();
		if (!lCurrent) throw new Error('lCurrent is undefined');
		lPerm.add(lCurrent);
		if (!(lPerm.size() % 1048576)) {
			console.log(`Temp Labels: ${lTemp.size()} | Perm Labels: ${lPerm.size()}`);
		}

		if (lCurrent.currentNode === d) {
			hasReachedDestination = true;
		}
		// line 4: for all outgoing edges of lCurrent.currentNode
		g.forEachLinkedNode(
			lCurrent.currentNode,
			(node, link) => {
				const edge = link.data;
				if (!lCurrent) throw new Error('lCurrent is undefined');

				// line 7
				const newLabel = {
					currentNode: String(node.id),
					cumulativeDuration: lCurrent.cumulativeDuration,
					cumulativeDistance: lCurrent.cumulativeDistance + edge.distance,
					cumulativePower: lCurrent.cumulativePower,
					cumulativeFinancialCost: lCurrent.cumulativeFinancialCost,
					chargingDuration: lCurrent.chargingDuration,
					chargingKw: lCurrent.chargingKw,
					chargingStops: lCurrent.chargingStops,
					precedingNode: lCurrent.currentNode,
					prevLabelIndex: lCurrent.currentLabelIndex,
					currentLabelIndex: uid(),
				};
				const soc = initialSoC - lCurrent.cumulativePower; // in kWh
				// lines 5: calculate the duration for this edge
				let edgeDuration = 0;
				// and 6: calculate the change in power for this edge
				let edgePower = 0;

				// calculations are based on the edge's end node type
				if (['a', 'i', 'b', 'd'].includes(node.data.type)) {
					// duration generated by OSRM
					edgeDuration = edge.duration ?? 0;

					// power from previous calculations based on road/vehicle data
					edgePower = edge.power;
				} else if (node.data.type === 'c') {
					edgeDuration = calculateChargingDuration({
						soc,
						capacity: node.data.current,
						targetSoc: node.data.chargeLevel,
						batteryCapacity,
					});

					// charge up (negative power)
					if (edgeDuration > 0) {
						edgePower = -1_000 * ((node.data.chargeLevel / 100) * batteryCapacity - soc);
						newLabel.chargingDuration += edgeDuration;
						newLabel.chargingKw += -edgePower / 1_000;
						newLabel.chargingStops += 1;

						// calculate the financial cost of charging
						newLabel.cumulativeFinancialCost =
							lCurrent.cumulativeFinancialCost +
							(edgeDuration * (node.data.costMin ?? 0)) / 60 -
							(edgePower * (node.data.costKwh ?? 0)) / 1_000;

						if (node.data.costKwh === 0) console.log('costKwh is 0', node.data);
					}

					// console.log({
					// 	edgePower,
					// 	edgeFinancialCost,
					// 	edgeDuration,
					// 	costMin: node.data.costMin,
					// 	costKwh: node.data.costKwh,
					// });
				} else if (node.data.type === 'o') {
					// duration is fixed as overhead in graph construction
					if (!edge.duration)
						throw new Error(
							`Edge duration is undefined and should have been added in graph construction as overhead amount: ${JSON.stringify(
								edge,
							)}`,
						);
					edgeDuration = edge.duration ?? 0;
				}

				newLabel.cumulativeDuration = lCurrent.cumulativeDuration + edgeDuration;

				newLabel.cumulativePower = lCurrent.cumulativePower + edgePower / 1_000;

				// line 8
				if (initialSoC - newLabel.cumulativePower >= minSoC) {
					if (fastMode) {
						// Equation box B
						const temp = lTemp.toArray();
						const tempMatches = temp.filter((l) => l.currentNode === newLabel.currentNode);
						if (tempMatches.every((l) => l[type] > newLabel[type])) {
							const permMatches = lPerm
								.toArray()
								.filter((l) => l.currentNode === newLabel.currentNode);
							if (permMatches.every((l) => l[type] > newLabel[type])) {
								// lines 10 and 11
								const newTemp = temp.filter((l) => l.currentNode !== newLabel.currentNode);
								lTemp.init(newTemp);
								lTemp.add(newLabel);
							}
						}
					} else {
						// line 9
						lTemp.add(newLabel);
					}
				}
			},
			true, // only outgoing edges
		); // line 11, end of for loop
	} // line 12, end of while loop
	console.log();

	// line 13
	if (lCurrent?.currentNode === d) {
		// console.log(JSON.stringify(lCurrent, null, 2));

		const perm = lPerm.toArray();
		const path = [];

		path.unshift(lCurrent);
		let current = lCurrent;
		while (current?.precedingNode) {
			const prev = perm.find(
				(p) =>
					p.currentNode === current?.precedingNode &&
					p.currentLabelIndex === current?.prevLabelIndex,
			);
			if (!prev) throw new Error('prev is undefined');
			path.unshift(prev);
			current = prev;
		}

		console.log({ path, d: path[path.length - 1] });
		lTemp.clear();
		lPerm.clear();

		return path;
	} else {
		const perm = lPerm.toArray().slice(-10);
		console.log({ perm });
		lTemp.clear();
		lPerm.clear();
		// line 14: “No feasible solution found.”
		console.error('No feasible solution found.');
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
	minimumCapacity = 22, // kW
	chargeLevelInterval = 25, // %
}: {
	intersections: ReturnType<typeof convertRouteFromStepsToIntersections>;
	stations: Awaited<ReturnType<typeof getPricingForChargingStations>>;
	overheadDuration?: number;
	minimumCapacity?: number;
	chargeLevelInterval?: number;
}) {
	const g = newGraph<NodeType, Edge>();

	//  add a node for the beginning of the route
	g.addNode('s', { type: 's', coordinates: intersections[0].intersection.location });
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
		});
		previous = `a${i}`;

		//  add a node for the station - ii
		g.addNode(`i${i}`, { type: 'i', station: station.slug });

		const [stationLon, stationLat] = closestIntersection.geometry.coordinates as [number, number];
		const fromTo = {
			origin: [stationLat, stationLon] as [number, number],
			destination: [station.location.latitude, station.location.longitude] as [number, number],
		};
		let route = await getRoute(fromTo);
		let { totalPower } = calcPowerForRouteWithVehicle(route);

		// add an edge from intersection to station
		g.addLink(`a${i}`, `i${i}`, {
			distance: route.distance,
			duration: route.duration,
			power: totalPower,
		});

		// add a node for oi that will have edges from all battery levels and back to the route
		g.addNode(`o${i}`, { type: 'o' });

		for (const outletType of station.outletList) {
			if (!outletType.capacity) continue;
			if (!outletType.costKwh && !outletType.costMin) {
				console.log(`skipping outlet without price data at station ${station.slug}`);
				continue;
			}
			if (outletType.capacity < minimumCapacity) {
				console.log(`skipping outlet with ${outletType.capacity}kW`);
				continue;
			}

			for (let j = chargeLevelInterval; j <= 100; j += chargeLevelInterval) {
				const chargeLevelLabel = `c${i}-${j}-${outletType.capacity}`;
				//  add a node for each charge level
				g.addNode(chargeLevelLabel, {
					type: 'c',
					chargeLevel: j,
					costKwh: outletType.costKwh,
					costMin: outletType.costMin,
					current: outletType.capacity,
				});

				//  add edges from the station to each battery level
				g.addLink(`i${i}`, chargeLevelLabel, {
					distance: 0,
					duration: undefined, // will be calculated based on starting and ending SoC
					power: 0, // changes SoC but does not consume energy
				});

				g.addLink(chargeLevelLabel, `o${i}`, {
					distance: 0,
					duration: overheadDuration, // for entering/leaving the vehicle, setting up charging, etc.
					power: 0,
				});
			}
		}

		// add a node for bi that has edges from ai and oi, same location as ai
		g.addNode(`b${i}`, { type: 'b', coordinates: closestIntersection.geometry.coordinates });

		const [closestLon, closestLat] = closestIntersection.geometry.coordinates as [number, number];
		route = await getRoute({
			origin: [closestLat, closestLon],
			destination: [station.location.latitude, station.location.longitude],
		});
		({ totalPower } = calcPowerForRouteWithVehicle(route));

		g.addLink(`o${i}`, `b${i}`, {
			distance: route.distance,
			duration: route.duration,
			power: totalPower,
		});

		g.addLink(`a${i}`, `b${i}`, {
			distance: 0,
			duration: 0,
			power: 0,
		});

		previous = `b${i}`;
		previousLonLat = closestIntersection.geometry.coordinates;
	}

	// add node for destination
	g.addNode('d', {
		type: 'd',
		coordinates: intersections[intersections.length - 1].intersection.location,
	});

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
	});

	console.log({
		nodes: g.getNodeCount(),
		edges: g.getLinkCount(),
		minimumCapacity,
		chargeLevelInterval,
	});
	const json = toJson(g);
	console.log({ graph: json });

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
 * @param intersections The intersections of the route to search
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
	// console.log({ start, end });
	let i = 0;
	while (!compare(intersections[i].intersection.location, start) && i < intersections.length) {
		i++;
	}
	if (i === intersections.length) {
		throw new Error('Start position not found in intersections');
	}

	let j = 0;
	while (!compare(intersections[j].intersection.location, end) && j < intersections.length) {
		j++;
	}
	if (j === intersections.length) {
		throw new Error('End position not found in intersections');
	}

	let distance = 0;
	let duration = 0;
	let power = 0;
	for (let k = i + 1; k <= j; k++) {
		distance += intersections[k].distance;
		duration += intersections[k].duration;
		power += intersections[k].power;
	}
	return { distance, duration, power };
}

/**
 * Calculate the time spent charging from a given SoC to a target SoC at the rate of capacity kW.
 * @param soc The current state of charge, in kWh
 * @param capacity The charging capacity, in kW
 * @param targetSoc The target state of charge, in %
 * @param batteryCapacity The battery capacity, in kWh
 * @returns The time spent charging, in s
 */
function calculateChargingDuration({
	soc,
	capacity,
	targetSoc,
	batteryCapacity,
}: {
	soc: number;
	capacity: number;
	targetSoc: number;
	batteryCapacity: number;
}): number {
	if (soc >= (targetSoc / 100) * batteryCapacity) {
		return 0;
	}

	const efficiency = 0.9;

	if (targetSoc <= 80) {
		return (((targetSoc / 100) * batteryCapacity - soc) * 3600) / (capacity * efficiency);
	}

	// slow down charging after 80% SoC
	const slowerCharge = 0.5;

	return (
		((0.8 * batteryCapacity - soc) / (capacity * efficiency) +
			((targetSoc / 100 - 0.8) * batteryCapacity) / (capacity * efficiency * slowerCharge)) *
		3600 // seconds per hour
	);
}

function financialCostComparator(a: NodeLabel, b: NodeLabel) {
	if (a.cumulativeFinancialCost === b.cumulativeFinancialCost) {
		return a.cumulativeDuration - b.cumulativeDuration;
	} else {
		return a.cumulativeFinancialCost - b.cumulativeFinancialCost;
	}
}

type NodeLabel = {
	cumulativeDuration: number;
	cumulativeDistance: number;
	cumulativePower: number;
	cumulativeFinancialCost: number;
	chargingDuration: number;
	chargingKw: number;
	chargingStops: number;
	precedingNode: string | null;
	prevLabelIndex: string; // "which of the labels belonging to the preceding node is relevant for getting the currently considered label"
	currentNode: string;
	currentLabelIndex: string;
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
			costKwh?: number;
			costMin?: number;
			current: number;
	  }
	| {
			type: 'o';
	  };

// type ArrayElement<ArrayType extends readonly unknown[]> =
// 	ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
// type IntersectionWithStats = ArrayElement<ReturnType<typeof convertRouteFromStepsToIntersections>>;

type Edge = {
	distance: number;
	duration?: number;
	power: number;
};
