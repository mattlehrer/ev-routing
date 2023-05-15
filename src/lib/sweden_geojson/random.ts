import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import combine from '@turf/combine';
import { point, type MultiPolygon } from '@turf/helpers';
import { readFileSync } from 'fs';

// read the geojson file
const geojson = JSON.parse(
	readFileSync('./src/lib/sweden_geojson/swedish_regions.geojson', 'utf8'),
);

// combine the geojson
const combined = combine(geojson);

// generate random lon/lat pair within sweden (11.0273686052, 55.3617373725, 23.9033785336, 69.1062472602)
const getRandomLonLat = () => {
	const lon = Math.random() * (23.9033785336 - 11.0273686052) + 11.0273686052;
	const lat = Math.random() * (69.1062472602 - 55.3617373725) + 55.3617373725;
	return [lon, lat];
};

function isInSweden(lonLat: number[]) {
	const result = combined.features.some((feature) =>
		booleanPointInPolygon(point(lonLat), feature as unknown as MultiPolygon),
	);
	if (result) {
		// console.log('found a point in sweden', lonLat);
		return true;
	}
	// console.log('did not find a point in sweden', lonLat);
	return false;
}

export function getLonLatInSweden() {
	let lonLat = getRandomLonLat();
	let tries = 0;

	while (!isInSweden(lonLat) && tries < 100) {
		lonLat = getRandomLonLat();
		tries++;
	}

	return lonLat;
}

console.log({ inSweden: getLonLatInSweden() });
