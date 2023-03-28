/**
 *
 * Equations from
 * Genikomsakis, K. N., & Mitrentsis, G. (2017). A computationally efficient simulation model for estimating energy consumption of electric vehicles in the context of route planning applications. Transportation Research Part D: Transport and Environment, 50, 98–118. https://doi.org/10.1016/j.trd.2016.10.014
 *
 *
 * https://reader.elsevier.com/reader/sd/pii/S1361920915302881?token=0963142177D36476367D34C6BA41C6BDDA082AB96D7D68817CE89AF499AC45A4FA3BC477E2D71FFB48C1E310DB5D73F3&originRegion=eu-west-1&originCreation=20230328104414
 *
 */

export type MotorType = 'induction_motor' | 'permanent_magnet_motor';

/**
 * load efficiency approximation
 * @param p_motorout current mechanical power of the motor
 * @param p_motorrated rated power of the motor
 * @param motor_type the type of motor, either 'induction_motor' or 'permanent_magnet_motor'
 * @returns the load efficiency of the motor
 */
export const efficiency = ({
	p_motorout,
	p_motorrated,
	motor_type,
}: {
	p_motorout: number;
	p_motorrated: number;
	motor_type: MotorType;
}): number => {
	const x = Math.abs(p_motorout) / p_motorrated;

	if (x < 0) {
		throw new Error('x is negative');
	}

	let cout1: number;
	let cout2: number;
	let cout3: number;
	let dout1: number;
	let dout2: number;
	let eout1: number;
	let eout2: number;

	if (p_motorout > 0) {
		if (motor_type === 'induction_motor') {
			cout1 = 0.9243;
			cout2 = 0.000127;
			cout3 = 0.01273;
			dout1 = 0.08;
			dout2 = 0.86;
			eout1 = -0.0736;
			eout2 = 0.9752;
		} else if (motor_type === 'permanent_magnet_motor') {
			cout1 = 0.942269;
			cout2 = 0.000061;
			cout3 = 0.006118;
			dout1 = 0.06;
			dout2 = 0.905;
			eout1 = -0.076;
			eout2 = 1.007;
		} else {
			throw new Error('unknown motor type');
		}
	} else {
		if (motor_type === 'induction_motor') {
			cout1 = 0.925473;
			cout2 = 0.000148;
			cout3 = 0.014849;
			dout1 = 0.075312;
			dout2 = 0.858605;
			eout1 = -0.062602;
			eout2 = 0.971034;
		} else if (motor_type === 'permanent_magnet_motor') {
			cout1 = 0.942545;
			cout2 = 0.000067;
			cout3 = 0.006732;
			dout1 = 0.057945;
			dout2 = 0.904254;
			eout1 = -0.066751;
			eout2 = 1.002698;
		} else {
			throw new Error('unknown motor type');
		}
	}

	if (x < 0.25) {
		return (cout1 * x + cout2) / (x + cout3);
	} else if (x < 0.75) {
		return dout1 * x + dout2;
	} else {
		return eout1 * x + eout2;
	}
};