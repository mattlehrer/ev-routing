import { describe, expect, it } from 'vitest';
import { efficiency } from './motor';

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

		it('is highest around 75% power', () => {
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

		it('differs by motor type', () => {
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

			expect(induction !== permanent).toBeTruthy();
		});
	});
});
