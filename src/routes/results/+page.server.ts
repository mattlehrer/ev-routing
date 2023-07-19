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
			route: JSON.parse(r.route),
			origin: JSON.parse(r.origin),
			destination: JSON.parse(r.destination),
			totalPower: JSON.parse(r.totalPower),
			optimizedCost: JSON.parse(r.optimizedCost),
			optimizedCostDuration: JSON.parse(r.optimizedCostDuration),
			optimizedDurationFinancialCost: JSON.parse(r.optimizedDurationFinancialCost),
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
