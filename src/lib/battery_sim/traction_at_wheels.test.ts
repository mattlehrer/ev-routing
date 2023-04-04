import { TestVehicle } from '$lib/vehicles/TestVehicle';
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
		it('is zero at 0 speed and Test Vehicle', () => {
			expect(
				calc_f_ad({
					v: 0,
					rho: 1.225,
					c_d: TestVehicle.drag_coefficient,
					area: TestVehicle.frontal_area,
				}),
			).toBe(0);
		});

		it('drag is ~53 with TestVehicle at 10m/s', () => {
			expect(
				calc_f_ad({
					v: 10,
					rho: 1.225,
					c_d: TestVehicle.drag_coefficient,
					area: TestVehicle.frontal_area,
				}),
			).toMatchInlineSnapshot('38.899875');
		});
	});

	describe('the force of rolling resistance', () => {
		it('is ~130.5 with Test Vehicle', () => {
			expect(
				calc_f_rr({
					mu_rr: TestVehicle.rolling_resistance_coefficient,
					m: TestVehicle.mass,
					theta: 0,
					g: 9.81,
				}),
			).toMatchInlineSnapshot('130.51224000000002');
		});
	});

	describe('the hill climbing force', () => {
		it('is 0 for Test Vehicle on flat route', () => {
			expect(
				calc_f_hc({
					m: TestVehicle.mass,
					theta: 0,
					g: 9.81,
				}),
			).toBe(0);
		});

		it('is ~1628.7 going uphill at 0.1 radians (about 5.7 degrees)', () => {
			expect(
				calc_f_hc({
					m: TestVehicle.mass,
					theta: 0.1,
					g: 9.81,
				}),
			).toMatchInlineSnapshot('1628.685354178854');
		});

		it('is -1628.7 going downhill at 0.1 radians (about 5.7 degrees)', () => {
			expect(
				calc_f_hc({
					m: TestVehicle.mass,
					theta: -0.1,
					g: 9.81,
				}),
			).toMatchInlineSnapshot('-1628.685354178854');
		});
	});

	describe('the force of linear acceleration', () => {
		it('is 0 with zero acceleration', () => {
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
		it('is 0 with Test Vehicle', () => {
			expect(
				calc_f_omega_a({
					c_i: TestVehicle.mass_correction_factor,
					m: TestVehicle.mass,
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
		it('is ~130.5 for a flat route with Test Vehicle', () => {
			expect(
				calc_f_te({
					f_ad: calc_f_ad({
						v: 0,
						rho: 1.225,
						c_d: TestVehicle.drag_coefficient,
						area: TestVehicle.frontal_area,
					}),
					f_rr: calc_f_rr({
						mu_rr: TestVehicle.rolling_resistance_coefficient,
						m: TestVehicle.mass,
						theta: 0,
					}),
					f_hc: calc_f_hc({
						m: TestVehicle.mass,
						theta: 0,
					}),
					f_la: calc_f_la({
						m: TestVehicle.mass,
						a: 0,
					}),
					f_omega_a: calc_f_omega_a({
						c_i: TestVehicle.mass_correction_factor,
						m: TestVehicle.mass,
						a: 0,
					}),
				}),
			).toMatchInlineSnapshot('130.51224000000002');
		});
	});

	describe('the traction power', () => {
		it('is 0 at 0 velocity', () => {
			const f = calc_f_te({
				f_ad: calc_f_ad({
					v: 0,
					rho: 1.225,
					c_d: TestVehicle.drag_coefficient,
					area: TestVehicle.frontal_area,
				}),
				f_rr: calc_f_rr({
					mu_rr: TestVehicle.rolling_resistance_coefficient,
					m: TestVehicle.mass,
					theta: 0,
				}),
				f_hc: calc_f_hc({
					m: TestVehicle.mass,
					theta: 0,
				}),
				f_la: calc_f_la({
					m: TestVehicle.mass,
					a: 0,
				}),
				f_omega_a: calc_f_omega_a({
					c_i: TestVehicle.mass_correction_factor,
					m: TestVehicle.mass,
					a: 0,
				}),
			});
			expect(
				calc_p_te({
					f_te: f,
					u: 0,
				}),
			).toBe(0);
		});

		it('is ~131 at 1 m/s velocity', () => {
			const v = 1;

			const f = calc_f_te({
				f_ad: calc_f_ad({
					v,
					rho: 1.225,
					c_d: TestVehicle.drag_coefficient,
					area: TestVehicle.frontal_area,
				}),
				f_rr: calc_f_rr({
					mu_rr: TestVehicle.rolling_resistance_coefficient,
					m: TestVehicle.mass,
					theta: 0,
				}),
				f_hc: calc_f_hc({
					m: TestVehicle.mass,
					theta: 0,
				}),
				f_la: calc_f_la({
					m: TestVehicle.mass,
					a: 0,
				}),
				f_omega_a: calc_f_omega_a({
					c_i: TestVehicle.mass_correction_factor,
					m: TestVehicle.mass,
					a: 0,
				}),
			});
			expect(
				calc_p_te({
					f_te: f,
					u: v,
				}),
			).toMatchInlineSnapshot('130.90123875000003');
		});

		it('is negative going downhill at 1 m/s', () => {
			const v = 1;

			const f = calc_f_te({
				f_ad: calc_f_ad({
					v,
					rho: 1.225,
					c_d: TestVehicle.drag_coefficient,
					area: TestVehicle.frontal_area,
				}),
				f_rr: calc_f_rr({
					mu_rr: TestVehicle.rolling_resistance_coefficient,
					m: TestVehicle.mass,
					theta: -0.1,
				}),
				f_hc: calc_f_hc({
					m: TestVehicle.mass,
					theta: -0.1,
				}),
				f_la: calc_f_la({
					m: TestVehicle.mass,
					a: 0,
				}),
				f_omega_a: calc_f_omega_a({
					c_i: TestVehicle.mass_correction_factor,
					m: TestVehicle.mass,
					a: 0,
				}),
			});
			expect(
				calc_p_te({
					f_te: f,
					u: v,
				}),
			).toMatchInlineSnapshot('-1498.4361330090885');
		});

		it('is more negative going downhill at 5 m/s', () => {
			const v = 5;

			const f = calc_f_te({
				f_ad: calc_f_ad({
					v,
					rho: 1.225,
					c_d: TestVehicle.drag_coefficient,
					area: TestVehicle.frontal_area,
				}),
				f_rr: calc_f_rr({
					mu_rr: TestVehicle.rolling_resistance_coefficient,
					m: TestVehicle.mass,
					theta: -0.1,
				}),
				f_hc: calc_f_hc({
					m: TestVehicle.mass,
					theta: -0.1,
				}),
				f_la: calc_f_la({
					m: TestVehicle.mass,
					a: 0,
				}),
				f_omega_a: calc_f_omega_a({
					c_i: TestVehicle.mass_correction_factor,
					m: TestVehicle.mass,
					a: 0,
				}),
			});
			expect(
				calc_p_te({
					f_te: f,
					u: v,
				}),
			).toMatchInlineSnapshot('-7445.500815045443');
		});
	});
});
