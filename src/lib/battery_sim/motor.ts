/**
 *
 * Equations from
 * Genikomsakis, K. N., & Mitrentsis, G. (2017). A computationally efficient simulation model for estimating energy consumption of electric vehicles in the context of route planning applications. Transportation Research Part D: Transport and Environment, 50, 98–118. https://doi.org/10.1016/j.trd.2016.10.014
 *
 *
 * https://reader.elsevier.com/reader/sd/pii/S1361920915302881?token=0963142177D36476367D34C6BA41C6BDDA082AB96D7D68817CE89AF499AC45A4FA3BC477E2D71FFB48C1E310DB5D73F3&originRegion=eu-west-1&originCreation=20230328104414
 *
 */

import { p_motor_out } from './transmission';

export type MotorType = 'induction_motor' | 'permanent_magnet_motor';

/**
 * load efficiency approximation
 * @param p_motor_out current mechanical power of the motor
 * @param p_motor_rated rated power of the motor
 * @param motor_type the type of motor, either 'induction_motor' or 'permanent_magnet_motor'
 * @returns the load efficiency of the motor
 */
export const efficiency = ({
	p_motor_out,
	p_motor_rated,
	motor_type,
}: {
	p_motor_out: number;
	p_motor_rated: number;
	motor_type: MotorType;
}): number => {
	const x = Math.abs(p_motor_out) / p_motor_rated;

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

	if (p_motor_out > 0) {
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

/**
 * calculates the efficiency normalization factor based
 * on rated output power and efficiency requirements
 * for IE2 efficiency level motors
 * @param p_motor_rated rated power of the motor in kW
 * @returns the efficiency normalization factor
 */
export const norm_factor = (p_motor_rated: number): number => {
	if (p_motor_rated <= 0.75) return 0.817;
	if (p_motor_rated <= 1.1) return 0.839;
	if (p_motor_rated <= 1.5) return 0.855;
	if (p_motor_rated <= 2.2) return 0.874;
	if (p_motor_rated <= 3) return 0.889;
	if (p_motor_rated <= 4) return 0.901;
	if (p_motor_rated <= 5.5) return 0.914;
	if (p_motor_rated <= 7.5) return 0.926;
	if (p_motor_rated <= 11) return 0.94;
	if (p_motor_rated <= 15) return 0.949;
	if (p_motor_rated <= 18.5) return 0.956;
	if (p_motor_rated <= 22) return 0.96;
	if (p_motor_rated <= 30) return 0.968;
	if (p_motor_rated <= 37) return 0.973;
	if (p_motor_rated <= 45) return 0.978;
	if (p_motor_rated <= 55) return 0.981;
	if (p_motor_rated <= 75) return 0.987;
	if (p_motor_rated <= 90) return 0.99;
	if (p_motor_rated <= 110) return 0.993;
	if (p_motor_rated <= 132) return 0.996;
	if (p_motor_rated <= 160) return 0.998;
	return 1.0;
};

/**
 * calculates the input power of the motor in W
 * in other words, how much power is drawn from the battery
 * to reach this level of motor output power when in motor mode, or
 * how much power is delivered to the battery when in generator mode
 * @param p_motor_out current mechanical power of the motor in W
 * @param regen_factor the speed-dependent regeneration factor
 * @param efficiency the load efficiency of the motor
 * @param norm_factor the efficiency normalization factor
 * @param p_te traction power in W
 * @returns the input power of the motor in W
 */
export const p_motor_in = ({
	p_motor_out,
	regen_factor,
	efficiency,
	norm_factor,
	p_te,
}: {
	p_motor_out: number;
	regen_factor: number;
	efficiency: number;
	norm_factor: number;
	p_te: number;
}): number => {
	if (regen_factor < 0 || regen_factor > 1) throw new Error('regen_factor must be between 0 and 1');
	if (efficiency < 0 || efficiency > 1) throw new Error('efficiency must be between 0 and 1');

	if (p_te <= 0) {
		return p_motor_out * regen_factor * efficiency * norm_factor;
	} else {
		return p_motor_out / (efficiency * norm_factor);
	}
};

/**
 * calculates the regeneration factor based on the current speed,
 * minimum speed for regeneration, and
 * the speed for maximum regneration (above which additional energy is heat waste)
 * @param u the current speed of the vehicle in m/s
 * @param u1 the minimum speed for regeneration in m/s
 * @param u2 the speed for maximum regneration in m/s
 * @param c the slope of the linear function
 * @returns the regeneration factor, between 0 and 1
 */
export const regen_factor = ({
	u,
	u1 = 1.39,
	u2 = 4.72,
	c = 1 / (4.72 - 1.39),
}: {
	u: number;
	u1?: number;
	u2?: number;
	c?: number;
}): number => {
	if (u1 < 0) throw new Error('u1 must be greater than 0');
	if (u2 < 0) throw new Error('u2 must be greater than 0');
	if (u2 < u1) throw new Error('u2 must be greater than u1');

	if (u <= u1) {
		return 0;
	} else if (u <= u2) {
		return c * (u - u1);
	} else {
		return 1;
	}
};

/**
 * calculates the total battery change in power in W
 * @param p_motor_in the input power of the motor in W
 * @param p_ac power draw by the accessories in W
 * @returns the total battery change in power in W
 */
export const p_battery_out = ({
	p_motor_in,
	p_ac,
}: {
	p_motor_in: number;
	p_ac: number;
}): number => {
	return p_motor_in + p_ac;
};

/**
 * calculates the total power of the motor in W
 * @param p_battery_out current power of the battery in W
 * @param rte the round trip efficiency factor for the battery
 * @return the total power of the motor in W
 */
export const p_total = ({
	p_battery_out,
	rte = 0.95,
}: {
	p_battery_out: number;
	rte: number;
}): number => {
	if (rte <= 0 || rte > 1) throw new Error('rte must be between 0 and 1');

	if (p_battery_out <= 0) {
		return p_battery_out * Math.sqrt(rte);
	} else {
		return p_battery_out / Math.sqrt(rte);
	}
};

/**
 * calculate the energy consumption in Wh in one second
 * @param p_te the current traction power in W
 * @param n_gear gear efficiency
 * @param efficiency motor efficiency
 * @param p_motor_rated rated power of the motor in W
 * @param regen_factor the speed-dependent regeneration factor
 * @param norm_factor the efficiency normalization factor
 * @param p_ac power draw by the accessories in W
 * @param rte the round trip efficiency factor for the battery
 * @returns the energy consumption in Wh in one second
 */
export const energy_consumption = ({
	p_te,
	n_gear,
	efficiency,
	p_motor_rated,
	regen_factor,
	norm_factor,
	p_ac,
	rte,
}: {
	p_te: number;
	n_gear: number;
	efficiency: number;
	p_motor_rated: number;
	regen_factor: number;
	norm_factor: number;
	p_ac: number;
	rte: number;
}): number => {
	const motor_out = p_motor_out({
		traction_power: p_te,
		n_gear,
	});

	console.log({ motor_out });

	const battery_out = p_battery_out({
		p_motor_in: p_motor_in({
			p_motor_out: motor_out,
			regen_factor,
			efficiency,
			norm_factor,
			p_te,
		}),
		p_ac,
	});
	if (p_te <= 0) {
		// regeneration from the wheels
		if (battery_out <= 0) {
			// battery is charging
			return (
				(p_te *
					n_gear *
					efficiency *
					(Math.abs(motor_out) / p_motor_rated) *
					regen_factor *
					norm_factor +
					p_ac) *
				Math.sqrt(rte)
			);
		} else {
			// battery is discharging because accessories draw exceeds regen
			return (
				(p_te *
					n_gear *
					efficiency *
					(Math.abs(motor_out) / p_motor_rated) *
					regen_factor *
					norm_factor +
					p_ac) /
				Math.sqrt(rte)
			);
		}
	} else {
		return (
			(p_te / (n_gear * efficiency * (Math.abs(motor_out) / p_motor_rated) * norm_factor) + p_ac) /
			Math.sqrt(rte)
		);
	}
};
