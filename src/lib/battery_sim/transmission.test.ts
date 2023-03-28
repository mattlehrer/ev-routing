import { describe, expect, it } from 'vitest';
import { omega_motor, p_motorout, t_motorout } from './transmission';

describe('transmission system', () => {
	describe('the force of aerodynamic drag', () => {
		it('is zero at 0 speed and the default params', () => {
			expect(
				omega_motor({
					g_ratio: 1,
					u_angular: 0,
					r_wheel: 0.3,
				}),
			).toBe(0);
		});
	});

	describe('the force of rolling resistance', () => {
		it('is 0 at 0 angular velocity', () => {
			expect(
				omega_motor({
					g_ratio: 1,
					u_angular: 0,
					r_wheel: 0.3,
				}),
			).toBe(0);
		});
	});

	describe('the mechanical power from the motor', () => {
		it('is zero at 0 traction power', () => {
			expect(
				p_motorout({
					traction_power: 0,
					n_gear: 1,
				}),
			).toBe(0);
		});

		it('is zero at 0 traction power with any gear efficiency', () => {
			expect(
				p_motorout({
					traction_power: 0,
					n_gear: 0.5,
				}),
			).toBe(0);
		});

		it('is positive with positive traction power', () => {
			expect(
				p_motorout({
					traction_power: 10,
					n_gear: 1,
				}),
			).toBe(10);
		});

		it('is negative with negative traction power', () => {
			expect(
				p_motorout({
					traction_power: -10,
					n_gear: 0.75,
				}),
			).toBe(-7.5);
		});
	});

	describe('the motor output torque', () => {
		it('is zero at 0 mechanical power', () => {
			expect(
				t_motorout({
					p_motorout: 0,
					omega_motor_speed: 1,
				}),
			).toBe(0);
		});

		it('throws with 0 angular speed', () => {
			expect(() =>
				t_motorout({
					p_motorout: 10,
					omega_motor_speed: 0,
				}),
			).toThrowError('omega_motor_speed is zero');
		});
	});
});
