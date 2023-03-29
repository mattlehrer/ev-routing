import { describe, expect, it } from 'vitest';
import { efficiency, normfactor, p_motorin } from './motor';

describe('motor', () => {
	describe('the efficiency curve', () => {
		it('is low at 25% power', () => {
			expect(
				efficiency({
					p_motorout: 25,
					p_motorrated: 100,
					motor_type: 'induction_motor',
				}),
			).toMatchInlineSnapshot('0.88');
		});

		it('is low at 50% power', () => {
			expect(
				efficiency({
					p_motorout: 50,
					p_motorrated: 100,
					motor_type: 'induction_motor',
				}),
			).toMatchInlineSnapshot('0.9');
		});

		it('is high at 100% power', () => {
			expect(
				efficiency({
					p_motorout: 100,
					p_motorrated: 100,
					motor_type: 'induction_motor',
				}),
			).toMatchInlineSnapshot('0.9016');
		});

		it('is quite high at 75% power', () => {
			expect(
				efficiency({
					p_motorout: 75,
					p_motorrated: 100,
					motor_type: 'induction_motor',
				}),
			).toMatchInlineSnapshot('0.9199999999999999');
		});

		it('is highest around 75% power for induction motors', () => {
			const e75 = efficiency({
				p_motorout: 75,
				p_motorrated: 100,
				motor_type: 'induction_motor',
			});

			const e100 = efficiency({
				p_motorout: 100,
				p_motorrated: 100,
				motor_type: 'induction_motor',
			});

			expect(e75 > e100).toBeTruthy();
		});

		it('is highest around 75% power for permanent magnet motors too', () => {
			const e75 = efficiency({
				p_motorout: 75,
				p_motorrated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			const e100 = efficiency({
				p_motorout: 100,
				p_motorrated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			expect(e75 > e100).toBeTruthy();
		});

		it('is about 98% of maximum efficiency at 100%', () => {
			const e75 = efficiency({
				p_motorout: 75,
				p_motorrated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			const e100 = efficiency({
				p_motorout: 100,
				p_motorrated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			expect(0.98 * e75 - e100).toBeCloseTo(0);
		});

		it('is about 98% of maximum efficiency at 50%', () => {
			const e75 = efficiency({
				p_motorout: 75,
				p_motorrated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			const e50 = efficiency({
				p_motorout: 50,
				p_motorrated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			expect(0.98 * e75 - e50).toBeCloseTo(0);
		});

		it('is higher for permanent_magnet_motor than for induction_motor', () => {
			const induction = efficiency({
				p_motorout: 75,
				p_motorrated: 100,
				motor_type: 'induction_motor',
			});

			const permanent = efficiency({
				p_motorout: 75,
				p_motorrated: 100,
				motor_type: 'permanent_magnet_motor',
			});

			expect(induction < permanent).toBeTruthy();
		});
	});

	describe('the normalization factor based on motor size', () => {
		it('is 1 for a 200kW motor', () => {
			expect(normfactor(200)).toBe(1);
		});

		it('is 0.817 for a 0.5kW motor', () => {
			expect(normfactor(0.5)).toBe(0.817);
		});

		it('is 0.998 for a 150kW motor', () => {
			expect(normfactor(150)).toBe(0.998);
		});
	});

	describe('the input power of the motor in W', () => {
		it('is 0 for 0kW motor at 100% efficiency', () => {
			expect(
				p_motorin({
					p_motorout: 0,
					efficiency: 1,
					normfactor: 0,
					p_te: 0,
				}),
			).toBe(0);
		});

		it('is ~55 for 50W output at 92% efficiency, .99 normfactor', () => {
			expect(
				p_motorin({
					p_motorout: 50,
					efficiency: 0.92,
					normfactor: 0.99,
					p_te: 100,
				}),
			).toMatchInlineSnapshot('54.89679402722881');
		});

		it('is ~53 for 50W output at 94% efficiency, 1.0 normfactor', () => {
			expect(
				p_motorin({
					p_motorout: 50,
					efficiency: 0.94,
					normfactor: 1.0,
					p_te: 100,
				}),
			).toMatchInlineSnapshot('53.19148936170213');
		});

		it('is 47 for 50W input at 94% efficiency, 1.0 normfactor', () => {
			expect(
				p_motorin({
					p_motorout: 50,
					efficiency: 0.94,
					normfactor: 1.0,
					p_te: -100,
				}),
			).toBe(47);
		});
	});
});
