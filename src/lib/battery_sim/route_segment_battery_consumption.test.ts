import { TestVehicle } from '$lib/vehicles/TestVehicle';
import { describe, expect, it } from 'vitest';
import { calc_route_segment_battery_power_flow } from './route_segment_battery_consumption';

describe('calc_route_segment_energy_consumption', () => {
	it('returns 0 for a segment with no duration', () => {
		const result = calc_route_segment_battery_power_flow({
			distance: 0,
			duration: 0,
			elevation_start: 0,
			elevation_end: 0,
			vehicle: { ...TestVehicle, accessory_power_draw: 0 },
			density_of_air: 0,
		});

		expect(result).toBe(0);
	});
	it('returns 0 for a segment with no duration even if distance is non-zero', () => {
		const result = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 0,
			elevation_start: 0,
			elevation_end: 0,
			vehicle: { ...TestVehicle, accessory_power_draw: 0 },
			density_of_air: 0,
		});

		expect(result).toBe(0);
	});

	it('calculates energy consumption correctly for a flat segment with known properties', () => {
		const result = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 0,
			elevation_end: 0,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		expect(result).toBeCloseTo(98.36);
	});

	it('calculates twice the energy for double the distance and time', () => {
		const result = calc_route_segment_battery_power_flow({
			distance: 500,
			duration: 60,
			elevation_start: 0,
			elevation_end: 0,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		const double = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 0,
			elevation_end: 0,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		expect(double).toEqual(2 * result);
	});

	it('calculates energy consumption for a faster segment as more than for a slower segment', () => {
		const fast = calc_route_segment_battery_power_flow({
			distance: 500,
			duration: 10,
			elevation_start: 0,
			elevation_end: 0,
			vehicle: { ...TestVehicle, accessory_power_draw: 0 },
			density_of_air: 1.25,
		});

		const slow = calc_route_segment_battery_power_flow({
			distance: 400,
			duration: 10,
			elevation_start: 0,
			elevation_end: 0,
			vehicle: { ...TestVehicle, accessory_power_draw: 0 },
			density_of_air: 1.25,
		});

		expect(slow).toBeLessThan(fast);
	});

	it('calculates energy consumption correctly for an uphill segment with known properties', () => {
		const result = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 0,
			elevation_end: 10,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		expect(result).toBeCloseTo(150.89);
	});

	it('calculates energy consumption for an uphill segment as more than for a flat segment', () => {
		const flat = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 0,
			elevation_end: 0,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		const uphill = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 0,
			elevation_end: 10,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		expect(flat).toBeLessThan(uphill);
	});

	it('calculates energy consumption for an uphill segment as more than for a downhill segment', () => {
		const downhill = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 10,
			elevation_end: 0,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		const uphill = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 0,
			elevation_end: 10,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		expect(downhill).toBeLessThan(uphill);
	});

	it('calculates energy consumption for a flat segment as more than for a downhill segment', () => {
		const downhill = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 10,
			elevation_end: 0,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		const flat = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 0,
			elevation_end: 0,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		expect(downhill).toBeLessThan(flat);
	});

	it('calculates energy consumption the same from 0 to 10m elevation as 10 to 20m', () => {
		const from0 = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 0,
			elevation_end: 10,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		const from10 = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 10,
			elevation_end: 20,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		expect(from0).toEqual(from10);
	});

	it('calculates energy consumption correctly for a downhill segment with known properties', () => {
		const result = calc_route_segment_battery_power_flow({
			distance: 1000,
			duration: 120,
			elevation_start: 10,
			elevation_end: 0,
			vehicle: TestVehicle,
			density_of_air: 1.25,
		});

		expect(result).toBeCloseTo(10.2);
	});
});
