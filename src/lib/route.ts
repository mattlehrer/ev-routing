import OSRM from '@project-osrm/osrm';
const osrm = new OSRM({ path: 'osrmdata/sweden-latest.osrm', algorithm: 'MLD' });

export function getRoute(data: {
	origin: [number, number];
	destination: [number, number];
}): Promise<OSRM.Route> {
	return new Promise((resolve, reject) => {
		console.log({ data });
		const [olat, olon] = data.origin;
		const [dlat, dlon] = data.destination;
		osrm.route(
			{
				coordinates: [
					// data is received as lat/lon but OSRM needs lon/lat
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
					resolve(result?.routes[0]);
				}
			},
		);
	});
}
