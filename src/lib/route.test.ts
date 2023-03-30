import { describe, expect, it } from 'vitest';
import { getRoute } from './route';

const data: {
	origin: [number, number];
	destination: [number, number];
} = { origin: [56.921, 13.99658], destination: [57.39762, 15.6665] };

describe('getRoute', () => {
	it('resolves with route data', async () => {
		const route = await getRoute(data);
		expect(route).toBeDefined(); // Ensure that a route was returned
		expect(route.distance).toBeGreaterThan(0); // Ensure that distance is positive
		expect(route.distance).toMatchInlineSnapshot('145965.1'); // Ensure that distance is correct
		expect(route.duration).toBeGreaterThan(0); // Ensure that duration is positive
		expect(Array.isArray(route.geometry.coordinates)).toBe(true); // Ensure that coordinates array exists in geometry object
	});
});
