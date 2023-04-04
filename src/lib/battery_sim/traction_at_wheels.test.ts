import { describe, expect, it } from 'vitest';
import {
	calc_f_ad,
	calc_f_hc,
	calc_f_la,
	calc_f_omega_a,
	calc_f_rr,
	calc_f_te,
	calc_p_te,
} from './traction_at_wheels';

describe('traction power at wheels', () => {
	describe('the force of aerodynamic drag', () => {
		it('is zero at 0 speed and the default params', () => {
			expect(
				calc_f_ad({
					v: 0,
					rho: 1.225,
					c_d: 0.315,
					area: 2.755,
				}),
			).toBe(0);
		});

		it('drag is ~53 with default params at 10m/s', () => {
			expect(
				calc_f_ad({
					v: 10,
					rho: 1.225,
					c_d: 0.315,
					area: 2.755,
				}),
			).toMatchInlineSnapshot('53.154281250000004');
		});
	});

	describe('the force of rolling resistance', () => {
		it('is ~147 with default params', () => {
			expect(
				calc_f_rr({
					mu_rr: 0.01,
					m: 1500,
					g: 9.81,
					theta: 0,
				}),
			).toMatchInlineSnapshot('147.15');
		});
	});

	describe('the hill climbing force', () => {
		it('is 0 with default params', () => {
			expect(
				calc_f_hc({
					m: 1500,
					g: 9.81,
					theta: 0,
				}),
			).toBe(0);
		});

		it('is ~1469 going uphill at 0.1 radians (about 5.7 degrees)', () => {
			expect(
				calc_f_hc({
					m: 1500,
					g: 9.81,
					theta: 0.1,
				}),
			).toMatchInlineSnapshot('1469.0487259580764');
		});
	});

	describe('the force of linear acceleration', () => {
		it('is 0 with default params', () => {
			expect(
				calc_f_la({
					m: 1500,
					a: 0,
				}),
			).toBe(0);
		});

		it('is 30 accelerating at 0.02 m/s^2 and 1500kg mass', () => {
			expect(
				calc_f_la({
					m: 1500,
					a: 0.02,
				}),
			).toBe(30);
		});
	});

	describe('the inertial force', () => {
		it('is 0 with default params', () => {
			expect(
				calc_f_omega_a({
					c_i: 0.05,
					m: 1500,
					a: 0,
				}),
			).toBe(0);
		});

		it('is 1.5 accelerating at 0.02 m/s^2 and 1500kg mass', () => {
			expect(
				calc_f_omega_a({
					c_i: 0.05,
					m: 1500,
					a: 0.02,
				}),
			).toBe(1.5);
		});
	});

	describe('the total tractive effort at the wheels', () => {
		it('is ~147 with default params for all sub functions', () => {
			expect(
				calc_f_te({
					f_ad: calc_f_ad({}),
					f_rr: calc_f_rr({}),
					f_hc: calc_f_hc({}),
					f_la: calc_f_la({}),
					f_omega_a: calc_f_omega_a({}),
				}),
			).toMatchInlineSnapshot('147.15');
		});

		it('is ~147 with default params for all sub functions', () => {
			expect(
				calc_f_te({
					f_ad: calc_f_ad({}),
					f_rr: calc_f_rr({}),
					f_hc: calc_f_hc({}),
					f_la: calc_f_la({}),
					f_omega_a: calc_f_omega_a({}),
				}),
			).toMatchInlineSnapshot('147.15');
		});
	});

	describe('the traction power', () => {
		it('is 0 at 0 velocity', () => {
			const f = calc_f_te({
				f_ad: calc_f_ad({}),
				f_rr: calc_f_rr({}),
				f_hc: calc_f_hc({}),
				f_la: calc_f_la({}),
				f_omega_a: calc_f_omega_a({}),
			});
			expect(
				calc_p_te({
					f_te: f,
					u: 0,
				}),
			).toBe(0);
		});

		it('is ~147 at 1 m/s velocity with default params for all sub functions', () => {
			const f = calc_f_te({
				f_ad: calc_f_ad({}),
				f_rr: calc_f_rr({}),
				f_hc: calc_f_hc({}),
				f_la: calc_f_la({}),
				f_omega_a: calc_f_omega_a({}),
			});
			expect(
				calc_p_te({
					f_te: f,
					u: 1,
				}),
			).toMatchInlineSnapshot('147.15');
		});
	});
});
