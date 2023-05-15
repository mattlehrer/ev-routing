import combine from '@turf/combine';
import { readFileSync, writeFileSync } from 'fs';

// read the geojson file
const geojson = JSON.parse(
	readFileSync('./src/lib/sweden_geojson/swedish_regions.geojson', 'utf8'),
);

// combine the geojson
const combined = combine(geojson);

// write the flattened geojson to a file
writeFileSync(
	'./src/lib/sweden_geojson/swedish_regions_combined.geojson',
	JSON.stringify(combined),
);
