import Database from 'better-sqlite3';
import type { PageServerLoad } from './$types';
const db = new Database('combined.db', { readonly: true });
const routeSelect = db.prepare(
	'SELECT origin, destination, route, totalPower, optimizedDuration FROM routes',
);
let routes = routeSelect
	.all()
	// .slice(0, 5)
	.map((r: any) => {
		return {
			route: JSON.parse(r.route),
			origin: JSON.parse(r.origin),
			destination: JSON.parse(r.destination),
			optimizedDuration: JSON.parse(r.optimizedDuration),
		};
	});
routes = routes.map((r: any) => ({
	...r,
	route: {
		...r.route,
		geometry: {
			...r.route.geometry,
			coordinates: r.route.geometry.coordinates.map((c: any) => [c[1], c[0]]),
		},
	},
}));

export const load = (async () => {
	console.log({ routes: routes.length });
	return { routes };
}) satisfies PageServerLoad;
