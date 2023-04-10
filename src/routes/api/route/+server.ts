import { calc_route_segment_battery_power_flow } from '$lib/battery_sim/route_segment_battery_consumption';
import { getRoute } from '$lib/route';
import { TestVehicle } from '$lib/vehicles/TestVehicle';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST = (async ({ request }) => {
	const data: {
		origin: [number, number];
		destination: [number, number];
	} = await request.json();

	if (!data.origin || !data.destination) throw error(400, 'Missing origin or destination');

	// console.time('getRoute');
	const route = await getRoute(data);
	// console.timeEnd('getRoute');

	// console.time('calc_route_segment_battery_power_flow');
	let totalPower = 0;
	route.legs.forEach((leg) => {
		leg.steps.forEach((step) => {
			step.power = calc_route_segment_battery_power_flow({
				distance: step.distance,
				duration: step.duration,
				elevation_start: 0,
				elevation_end: 0,
				vehicle: TestVehicle,
				density_of_air: 1.225,
			});
			totalPower += step.power;
		});
	});
	// console.timeEnd('calc_route_segment_battery_power_flow');
	console.log({ totalPower });

	// console.log({ geojson: route.legs[0].steps });

	// get charging stations
	// const stationData = await getChargingStationsAlongRoute({
	// 	origin: data.origin,
	// 	destination: data.destination,
	// });
	const stationData = { stations: [] };

	return json({ route, stations: stationData.stations, totalPower });
}) satisfies RequestHandler;
