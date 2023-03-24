import OSRM from '@project-osrm/osrm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const osrm = new OSRM({ path: 'osrmdata/sweden-latest.osrm', algorithm: 'MLD' });

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
				overview: 'full',
				annotations: true,
				geometries: 'geojson',
			},
			(err, result) => {
				if (err) {
					console.error(err);
					reject(err);
				} else {
					// console.log(JSON.stringify(result, null, 2));
					resolve(json(result?.routes[0]));
				}
			},
		);
	});
}) satisfies RequestHandler;
