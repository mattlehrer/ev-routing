import { getRoute } from '$lib/route';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST = (async ({ request }) => {
	const data = await request.json();

	const route = await getRoute(data);
	return json(route);
}) satisfies RequestHandler;
