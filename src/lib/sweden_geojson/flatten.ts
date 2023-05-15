import flatten from '@turf/flatten';
import { readFileSync, writeFileSync } from 'fs';

// read the geojson file
const geojson = JSON.parse(
	readFileSync('./src/lib/sweden_geojson/swedish_regions.geojson', 'utf8'),
);

// flatten the geojson
const flattened = flatten(geojson);

// write the flattened geojson to a file
writeFileSync(
	'./src/lib/sweden_geojson/swedish_regions_flattened.geojson',
	JSON.stringify(flattened),
);
