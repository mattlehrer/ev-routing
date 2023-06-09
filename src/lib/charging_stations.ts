import { CHARGING_STATION_API_BASE_URL, CHARGING_STATION_API_SITE_URL } from '$env/static/private';
import { error } from '@sveltejs/kit';
import type { LatLonPair } from './lat_lon';
import { placeData } from './place_data';
// import { printProgress } from './utils/progress';

export async function getChargingStationsAlongRoute({
	origin,
	destination,
	maxDetour = 8,
	getPricing = false,
}: {
	origin: LatLonPair;
	destination: LatLonPair;
	maxDetour?: number;
	getPricing?: boolean;
}) {
	const [olat, olon] = origin;
	const [dlat, dlon] = destination;

	let originData: ChargingStationAPILatLonResponse | undefined = placeData.get(origin);
	let destinationData: ChargingStationAPILatLonResponse | undefined = placeData.get(destination);

	if (!originData) {
		// console.log('fetching origin data');
		const originRes = await fetch(
			`${CHARGING_STATION_API_BASE_URL}/search?v2=true&lang=en&q=${olat}, ${olon}&loc=51.5,-0.12`,
			chargingStationAPIFetchOptions,
		);
		originData = await originRes.json();
		if (!originData) throw error(500, 'Bad response from Charging Station API for origin');
		placeData.set(origin, originData);
	}

	if (!destinationData) {
		// console.log('fetching destination data');
		const destinationRes = await fetch(
			`${CHARGING_STATION_API_BASE_URL}/search?v2=true&lang=en&q=${dlat}, ${dlon}&loc=51.5,-0.12`,
			chargingStationAPIFetchOptions,
		);
		destinationData = await destinationRes.json();
		if (!destinationData)
			throw error(500, 'Bad response from Charging Station API for destination');
		placeData.set(destination, destinationData);
	}

	// console.log({ originData, destinationData });
	// console.log(JSON.stringify(originData, null, 2));
	// console.log(JSON.stringify(destinationData, null, 2));

	let stationData: ChargingStationAPIRouteResponse;

	try {
		const routeRes = await fetch(
			`${CHARGING_STATION_API_BASE_URL}/route?from=${originData[0].title}&fromlat=${originData[0].location.lat}&fromlng=${originData[0].location.lng}&fromcc=&via=&vialat=&vialng=&to=${destinationData[0].title}&tolat=${destinationData[0].location.lat}&tolng=${destinationData[0].location.lng}&preference=recommended&detour=${maxDetour}&minspeed=3&maxspeed=6`,
			chargingStationAPIFetchOptions,
		);
		stationData = await routeRes.json();
	} catch (err) {
		console.error(err);
		throw error(500, 'Bad response from Charging Station API for route');
	}

	if (getPricing) {
		const stationsWithPricingData = await getPricingForChargingStations(stationData.stations);
		stationData.stations = stationsWithPricingData;
	}

	return stationData;
}

export async function getPricingForChargingStations(stations: Array<ChargingStationBasic>) {
	console.log(`getting data for ${stations.length} stations`);
	// printProgress(0);
	// let progressCount = 0;

	const stationSlugs = stations.map((station) => station.slug);

	const stationData: ChargingStationAPIStation[] = [];
	const statusData: ChargingStationAPIStationStatus[] = [];
	for (const slug of stationSlugs) {
		// progressCount++;

		const resStation = await fetch(
			`${CHARGING_STATION_API_BASE_URL}/station/${slug}`,
			chargingStationAPIFetchOptions,
		);
		if (!resStation.ok) {
			await new Promise((resolve) => setTimeout(resolve, 30_000));
			const retry = await fetch(
				`${CHARGING_STATION_API_BASE_URL}/station/${slug}`,
				chargingStationAPIFetchOptions,
			);
			if (!retry.ok) throw new Error('failed to fetch station data');
			stationData.push(await retry.json());
		}
		try {
			stationData.push(await resStation.json());
		} catch (error) {
			console.error(error);
		}

		// Wait for 2 seconds before making the next request
		await new Promise((resolve) => setTimeout(resolve, randomWait()));

		const resStatus = await fetch(
			`${CHARGING_STATION_API_BASE_URL}/status/${slug}`,
			chargingStationAPIFetchOptions,
		);
		if (!resStation.ok) {
			await new Promise((resolve) => setTimeout(resolve, 30_000));
			const retry = await fetch(
				`${CHARGING_STATION_API_BASE_URL}/status/${slug}`,
				chargingStationAPIFetchOptions,
			);
			if (!retry.ok) throw new Error('failed to fetch status data');
			stationData.push(await retry.json());
		}
		try {
			statusData.push(await resStatus.json());
		} catch (error) {
			console.error(error);
		}

		// printProgress((progressCount / stationSlugs.length) * 100);

		// Wait for 2 seconds before making the next request
		await new Promise((resolve) => setTimeout(resolve, randomWait()));
	}

	console.log();
	console.log('stations: ', stationData.length, 'statuses: ', statusData.length);

	try {
		const stationDataWithStationStatus = stationData.map((station, i) => {
			return {
				...station,
				outletList: station.outletList.map((list) => ({
					...list,
					outlets: list.outlets.map((outlet) => ({
						...outlet,
						pricing: Array.isArray(statusData[i])
							? statusData[i].find((outletStatus) => outletStatus.id === outlet.identifier)
							: undefined,
					})),
				})),
			};
		});

		// save max price for each station
		stationDataWithStationStatus.forEach((station) => {
			station.outletList.forEach((outletType) => {
				if (outletType.costKwh) {
					// do nothing
				} else if (outletType.outlets.some((outlet) => outlet.pricing?.free)) {
					outletType.costKwh = 0;
					if (!outletType.costMin) {
						outletType.costMin = 0;
					}
				} else {
					const minKwh = Math.min(...outletType.outlets.map((outlet) => outlet.costKwh), 0);
					const minPerMin = Math.min(...outletType.outlets.map((outlet) => outlet.costMin), 0);
					if (minKwh > 0) {
						outletType.costKwh = minKwh;
						outletType.costMin = minPerMin;
					} else if (station.chargeInfoLocal) {
						// parse chargeInfoLocal - need find out how many formats it could be in

						const perMinRegex = / (\d*,?\d*) kr\/min/g;
						const perMinMatches = [...station.chargeInfoLocal.matchAll(perMinRegex)];
						if (perMinMatches && perMinMatches.length > 0) {
							outletType.costMin = parseFloat(perMinMatches[0][1].replace(',', '.'));
						}

						const perKWregex = /upp till (\d*) kW: (\d*,\d*) kr\/kWh/g;
						const perKWmatches = [...station.chargeInfoLocal.matchAll(perKWregex)];
						if (perKWmatches && perKWmatches.length > 0) {
							// find the right price for the outlet type
							let i = 0;
							let [, maxKw, price] = perKWmatches[i];
							while (outletType.capacity <= parseInt(maxKw) && i < perKWmatches.length - 1) {
								i++;
								[, maxKw, price] = perKWmatches[i];
							}
							outletType.costKwh = parseFloat(price.replace(',', '.'));
						} else {
							// some other technique for parsing?
							outletType.costKwh = undefined;
						}
					} else {
						outletType.costKwh = undefined;
						outletType.costMin = undefined;
					}
				}
			});
		});

		const output = stations.map((station) => ({
			...station,
			...stationDataWithStationStatus.find((stationData) => stationData.slug === station.slug),
		}));

		return output;
	} catch (err) {
		console.log(err);
		throw error(500, 'Bad response from Charging Station API for pricing');
	}
}

const chargingStationAPIFetchOptions = {
	headers: {
		accept: 'application/json',
		'accept-encoding': 'gzip, deflate, br',
		'accept-language': 'en-US,en;q=0.9',
		'cache-control': 'no-cache',
		dnt: '1',
		origin: CHARGING_STATION_API_SITE_URL,
		pragma: 'no-cache',
		referer: `${CHARGING_STATION_API_SITE_URL}/`,
		// 'sec-ch-ua': '"Chromium";v="113", "Not-A.Brand";v="24"',
		// 'sec-ch-ua-mobile': '?0',
		// 'sec-ch-ua-platform': ' "macOS"',
		'sec-fetch-dest': 'empty',
		'sec-fetch-mode': 'cors',
		'sec-fetch-site': 'same-site',
		'user-agent':
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
		// 'user-agent':
		// 	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
	},
};

const randomWait = () => Math.floor(Math.random() * 30000 + 5000);

export type ChargingStationAPIRouteResponse = {
	type: 'FeatureCollection';
	features: {
		bbox: [number, number, number, number];
		type: 'Feature';
		properties: {
			summary: {
				distance: number;
				duration: number;
			};
			way_points: [number, number];
		};
		geometry: {
			coordinates: [number, number][];
			type: 'LineString';
		};
	}[];
	bbox: [number, number, number, number];
	metadata: null;
	from: {
		longitude: number;
		latitude: number;
		name: string;
		countrycode: string;
	};
	to: {
		longitude: number;
		latitude: number;
		name: string;
	};
	via: {
		longitude: number | null;
		latitude: number | null;
		name: string | null;
	};
	units: 'km';
	stations: Array<ChargingStationBasic> | Awaited<ReturnType<typeof getPricingForChargingStations>>;
};

export type ChargingStationBasic = {
	slug: string;
	leg: number;
	title: string;
	distance: number;
	detour: number;
	location: {
		latitude: number;
		longitude: number;
	};
	locationAddress: {
		country: string;
		city: string;
		street: string;
	};
	maxCapacity: number;
	minCapacity: number;
	plugType1: number;
	plugType2: number;
	plugType3: number;
	plugTesla: number;
	plugCCS: number;
	plugChademo: number;
	owner: string;
	status: number;
};

export type ChargingStationAPILatLonResponse = Array<{
	title: string;
	type: string;
	locality: string | null;
	street: string;
	city: string;
	state: string;
	country: string;
	countrycode: string;
	location: {
		lat: number;
		lng: number;
	};
	distance: number;
}>;

export interface ChargingStationAPIStation extends ChargingStationBasic {
	description: string;
	comment: string;
	contact: string;
	website: string;
	locationAddress: {
		city: string;
		country: string;
		countryCode: string;
		county: string;
		street: string;
		full: string;
		zip: string;
	};
	operator: string;
	operatorOther: string;
	operatorPricingInfo: string;
	chargeInfoLocal: string;
	chargeInfoEn: string;
	access: string;
	reservation: string;
	realtime: number;
	freeCharging: number;
	freeParking: number;
	authCard: number;
	openStatus: number;
	openingHours: string;
	elevation: number;
	stationType: string;
	photos: number;
	comments: number;
	outletList: OutletList[];
	outletCount: number;
}

type ChargingOutlet = {
	plug: string;
	identifier: string;
	name: string;
	capacity: number;
	current: number;
	voltage: number;
	status: number;
	costMin: number;
	costKwh: number;
	costCurrency: string;
	slug: string;
};

type OutletList = {
	capacity: number;
	costCurrency: string;
	costKwh: number | undefined;
	costMin: number | undefined;
	count: number;
	current: number;
	outlets: ChargingOutlet[];
	plug: string;
	slug: string;
	status: number;
	voltage: number;
};

export type ChargingStationAPIStationStatus = Array<{
	id: string;
	status: number;
	price: string | null;
	free: number | null;
}>;
