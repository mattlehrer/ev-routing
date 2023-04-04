import { calc_route_segment_battery_power_flow } from '$lib/battery_sim/route_segment_battery_consumption';
import { getRoute } from '$lib/route';
import { TestVehicle } from '$lib/vehicles/TestVehicle';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST = (async ({ request }) => {
	const data = await request.json();

	const route = await getRoute(data);

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
		});
	});

	const power = route.legs.map((leg) =>
		leg.steps.map((step) =>
			calc_route_segment_battery_power_flow({
				distance: step.distance,
				duration: step.duration,
				elevation_start: 0,
				elevation_end: 0,
				vehicle: TestVehicle,
				density_of_air: 1.225,
			}),
		),
	);
	console.log({ route, power });
	const totalPower = power.flat().reduce((a, b) => a + b, 0);
	console.log({ totalPower });

	return json({ route, power });
}) satisfies RequestHandler;
