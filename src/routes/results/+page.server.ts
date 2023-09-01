import type OSRM from '@project-osrm/osrm';
import Database from 'better-sqlite3';
import type { PageServerLoad } from './$types';
const db = new Database('combined.db', { readonly: true });
const routeSelect = db.prepare(
	'SELECT id, origin, destination, route, totalPower, optimizedCost, optimizedCostDuration, optimizedDurationFinancialCost, optimizedDuration FROM routes',
);
let routes = routeSelect
	.all()
	// .slice(0, 5)
	.map((r: any) => {
		return {
			id: String(r.id),
			route: JSON.parse(r.route) as OSRM.Route,
			origin: JSON.parse(r.origin) as { latitude: number; longitude: number },
			destination: JSON.parse(r.destination) as { latitude: number; longitude: number },
			totalPower: JSON.parse(r.totalPower) as number,
			optimizedCost: JSON.parse(r.optimizedCost) as number,
			optimizedCostDuration: JSON.parse(r.optimizedCostDuration) as number,
			optimizedDurationFinancialCost: JSON.parse(r.optimizedDurationFinancialCost) as number,
			optimizedDuration: JSON.parse(r.optimizedDuration) as number,
		};
	});
routes = routes.map((r) => ({
	...r,
	route: {
		...r.route,
		geometry: {
			...r.route.geometry,
			coordinates: r.route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
		},
	},
}));

export const load = (async () => {
	console.log({ routes: routes.length });
	return { routes };
}) satisfies PageServerLoad;
