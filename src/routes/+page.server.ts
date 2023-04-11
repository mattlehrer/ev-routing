import { getChargingStationsAlongRoute } from '$lib/charging_stations';
import type { LatLonPair } from '$lib/lat_lon';
import { calcPowerForRouteWithVehicle, getRoute, type Route } from '$lib/route';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ url }) => {
	console.log('running load');
	const searchParams = url.searchParams;
	const olatParam = searchParams.get('olat');
	const olonParam = searchParams.get('olon');
	const dlatParam = searchParams.get('dlat');
	const dlonParam = searchParams.get('dlon');

	let route: Route | undefined = undefined;
	let totalPower = 0;
	let origin: LatLonPair | undefined;
	let destination: LatLonPair | undefined;

	if (olatParam && olonParam && dlatParam && dlonParam) {
		const olat = Number(JSON.parse(decodeURI(olatParam)));
		const olon = Number(JSON.parse(decodeURI(olonParam)));
		const dlat = Number(JSON.parse(decodeURI(dlatParam)));
		const dlon = Number(JSON.parse(decodeURI(dlonParam)));

		if (isNaN(olat) || isNaN(olon) || isNaN(dlat) || isNaN(dlon)) {
			// don't calculate route;
		} else {
			origin = [olat, olon];
			destination = [dlat, dlon];
			route = await getRoute({ origin, destination });

			({ route, totalPower } = calcPowerForRouteWithVehicle(route));
		}
	}

	return {
		olat: olatParam && Number(JSON.parse(decodeURI(olatParam || ''))),
		olon: olonParam && Number(JSON.parse(decodeURI(olonParam || ''))),
		dlat: dlatParam && Number(JSON.parse(decodeURI(dlatParam || ''))),
		dlon: dlonParam && Number(JSON.parse(decodeURI(dlonParam || ''))),
		route,
		totalPower,
		streamed: {
			stationData:
				route &&
				origin &&
				destination &&
				getChargingStationsAlongRoute({
					origin,
					destination,
					getPricing: true,
				}),
			// three: new Promise((fulfil) => {
			// 	setTimeout(() => {
			// 		fulfil(3);
			// 	}, 1000);
			// }),
		},
	};
}) satisfies PageServerLoad;

import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const originString = data.get('originLatLng') as string;
		const destinationString = data.get('destinationLatLng') as string;

		const origin = JSON.parse(originString) as [number, number];
		const destination = JSON.parse(destinationString) as [number, number];

		if (!origin || !destination) {
			return {};
		}

		if (
			!Array.isArray(origin) ||
			origin.length !== 2 ||
			!Array.isArray(destination) ||
			destination.length !== 2
		) {
			throw error(400, 'Invalid origin or destination');
		}

		// load will run on the server and load the data
		return {
			success: true,
		};
	},
} satisfies Actions;
