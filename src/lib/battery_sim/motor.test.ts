import { describe, expect, it } from 'vitest';
import {
	efficiency,
	energy_consumption,
	norm_factor,
	p_motor_in,
	p_total,
	regen_factor,
} from './motor';

describe('motor', () => {
	describe('the efficiency curve', () => {
		it('is low at 25% power', () => {
			expect(
				efficiency({
					p_motor_out: 25,
					p_motor_rated: 100,
					motor_type: 'induction_motor',
				}),
			).toMatchInlineSnapshot('0.88');
		});

		it('is low at 50% power', () => {
			expect(
				efficiency({
					p_motor_out: 50,
					p_motor_rated: 100,
					motor_type: 'induction_motor',
				}),
			).toMatchInlineSnapshot('0.9');
		});

		it('is high at 100% power', () => {
			expect(
				efficiency({
					p_motor_out: 100,
					p_motor_rated: 100,
					motor_type: 'induction_motor',
				}),
			).toMatchInlineSnapshot('0.9016');
		});

		it('is quite high at 75% power', () => {
			expect(
				efficiency({
					p_motor_out: 75,
					p_motor_rated: 100,
					motor_type: 'induction_motor',
				}),
			).toMatchInlineSnapshot('0.9199999999999999');
		});

		it('is highest around 75% power for induction motors', () => {
			const e75 = efficiency({
				p_motor_out: 75,
				p_motor_rated: 100,
				motor_type: 'induction_motor',
			});

			const e100 = efficiency({
				p_motor_out: 100,
				p_motor_rated: 100,
				motor_type: 'induction_motor',
			});

			expect(e75 > e100).toBeTruthy();
		});

		it('is highest around 75% power for permanent magnet motors too', () => {
			const e75 = efficiency({
				p_motor_out: 75,
				p_motor_rated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			const e100 = efficiency({
				p_motor_out: 100,
				p_motor_rated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			expect(e75 > e100).toBeTruthy();
		});

		it('is about 98% of maximum efficiency at 100%', () => {
			const e75 = efficiency({
				p_motor_out: 75,
				p_motor_rated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			const e100 = efficiency({
				p_motor_out: 100,
				p_motor_rated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			expect(0.98 * e75 - e100).toBeCloseTo(0);
		});

		it('is about 98% of maximum efficiency at 50%', () => {
			const e75 = efficiency({
				p_motor_out: 75,
				p_motor_rated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			const e50 = efficiency({
				p_motor_out: 50,
				p_motor_rated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			expect(0.98 * e75 - e50).toBeCloseTo(0);
		});

		it('is higher for permanent_magnet_motor than for induction_motor', () => {
			const induction = efficiency({
				p_motor_out: 75,
				p_motor_rated: 100,
				motor_type: 'induction_motor',
			});

			const permanent = efficiency({
				p_motor_out: 75,
				p_motor_rated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			expect(induction < permanent).toBeTruthy();
		});
	});

	describe('the normalization factor based on motor size', () => {
		it('is 1 for a 200kW motor', () => {
			expect(norm_factor(200)).toBe(1);
		});

		it('is 0.817 for a 0.5kW motor', () => {
			expect(norm_factor(0.5)).toBe(0.817);
		});

		it('is 0.998 for a 150kW motor', () => {
			expect(norm_factor(150)).toBe(0.998);
		});
	});

	describe('the input power of the motor in W', () => {
		it('is 0 for 0kW motor at 100% efficiency', () => {
			expect(
				p_motor_in({
					p_motor_out: 0,
					regen_factor: 0,
					efficiency: 1,
					norm_factor: 0,
					p_te: 0,
				}),
			).toBe(0);
		});

		it('is ~55 for 50W output at 92% efficiency, .99 norm_factor', () => {
			expect(
				p_motor_in({
					p_motor_out: 50,
					regen_factor: 0,
					efficiency: 0.92,
					norm_factor: 0.99,
					p_te: 100,
				}),
			).toMatchInlineSnapshot('54.89679402722881');
		});

		it('does not change with different regen_factor in motor mode', () => {
			const a = p_motor_in({
				p_motor_out: 50,
				regen_factor: 0.5,
				efficiency: 0.92,
				norm_factor: 0.99,
				p_te: 100,
			});

			const b = p_motor_in({
				p_motor_out: 50,
				regen_factor: 0.75,
				efficiency: 0.92,
				norm_factor: 0.99,
				p_te: 100,
			});

			expect(a === b).toBeTruthy();
		});

		it('is ~53 for 50W output at 94% efficiency, 1.0 norm_factor', () => {
			expect(
				p_motor_in({
					p_motor_out: 50,
					regen_factor: 0,
					efficiency: 0.94,
					norm_factor: 1.0,
					p_te: 100,
				}),
			).toMatchInlineSnapshot('53.19148936170213');
		});

		it('is 47 for 50W input at 94% efficiency, 1.0 norm_factor, 1.0 regen_factor', () => {
			expect(
				p_motor_in({
					p_motor_out: 50,
					regen_factor: 1.0,
					efficiency: 0.94,
					norm_factor: 1.0,
					p_te: -100,
				}),
			).toBe(47);
		});

		it('increases with higher regen_factors in generator mode', () => {
			const a = p_motor_in({
				p_motor_out: 50,
				regen_factor: 0.5,
				efficiency: 0.92,
				norm_factor: 0.99,
				p_te: -100,
			});

			const b = p_motor_in({
				p_motor_out: 50,
				regen_factor: 0.75,
				efficiency: 0.92,
				norm_factor: 0.99,
				p_te: -100,
			});

			expect(a < b).toBeTruthy();
		});

		it('is ~37.6 for 50W input at 94% efficiency, 1.0 norm_factor, 1.0 regen_factor', () => {
			expect(
				p_motor_in({
					p_motor_out: 50,
					regen_factor: 0.8,
					efficiency: 0.94,
					norm_factor: 1.0,
					p_te: -100,
				}),
			).toMatchInlineSnapshot('37.599999999999994');
		});

		it('throws if regen_factor is not between 0 and 1', () => {
			expect(() =>
				p_motor_in({
					p_motor_out: 50,
					regen_factor: 1.1,
					efficiency: 0.94,
					norm_factor: 1.0,
					p_te: -100,
				}),
			).toThrow();
		});

		it('throws if efficiency is not between 0 and 1', () => {
			expect(() =>
				p_motor_in({
					p_motor_out: 50,
					regen_factor: 1.0,
					efficiency: 1.1,
					norm_factor: 1.0,
					p_te: -100,
				}),
			).toThrow();
		});
	});

	describe('the regeneration factor', () => {
		it('is 0 for p_te of 0', () => {
			expect(regen_factor({ u: 1.39 })).toBe(0);
		});

		it('is 0.5 for p_te of 100', () => {
			expect(regen_factor({ u: 1.39 + 3.33 / 2 })).toBeCloseTo(0.5);
		});

		it('is 1 above 4.72', () => {
			expect(regen_factor({ u: 5 })).toBe(1);
		});
	});

	describe('the total output power of the motor', () => {
		it('is 0 for p_battery_out of 0', () => {
			expect(
				p_total({
					p_battery_out: 0,
					rte: 0.5,
				}),
			).toBe(0);
		});

		it('is 200 for rte of 0.25 and p_battery_out of 100', () => {
			expect(
				p_total({
					p_battery_out: 100,
					rte: 0.25,
				}),
			).toBe(200);
		});

		it('throws for rte of 0', () => {
			expect(() =>
				p_total({
					p_battery_out: 100,
					rte: 0,
				}),
			).toThrow();
		});
	});

	describe('the energy consumption from the battery in one second', () => {
		it('can be 0', () => {
			expect(
				energy_consumption({
					p_te: 0,
					n_gear: 0.97,
					efficiency: 0.95,
					p_motor_rated: 100,
					regen_factor: 0,
					norm_factor: 0.99,
					p_ac: 0,
					rte: 0.75,
				}),
			).toBe(0);
		});

		it('is ~308 with only accessories drawing 300', () => {
			expect(
				energy_consumption({
					p_te: 0,
					n_gear: 0.97,
					efficiency: 0.95,
					p_motor_rated: 100,
					regen_factor: 0,
					norm_factor: 0.99,
					p_ac: 300,
					rte: 0.95,
				}),
			).toMatchInlineSnapshot('307.79350562554623');
		});

		it('is ~308 with only accessories drawing 300', () => {
			expect(
				energy_consumption({
					p_te: -900,
					n_gear: 0.97,
					efficiency: 0.99,
					p_motor_rated: 1000,
					regen_factor: 1,
					norm_factor: 0.99,
					p_ac: 300,
					rte: 0.95,
				}),
			).toMatchInlineSnapshot('-435.6452862690645');
		});
	});
});
