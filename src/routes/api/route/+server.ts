import OSRM from '@project-osrm/osrm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const osrm = new OSRM('osrmdata/sweden-latest.osrm');

export const POST = (async ({ request }) => {
	const data = await request.json();
	return new Promise((resolve, reject) => {
		console.log({ data });
		const [olat, olon] = data.origin;
		const [dlat, dlon] = data.destination;
		osrm.route(
			{
				coordinates: [
					[olon, olat],
					[dlon, dlat],
				],
				steps: true,
				annotations: true,
				geometries: 'geojson',
			},
			(err, result) => {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					console.log(JSON.stringify(result, null, 2));
					resolve(json(result?.routes[0]));
				}
			},
		);
	});
}) satisfies RequestHandler;
