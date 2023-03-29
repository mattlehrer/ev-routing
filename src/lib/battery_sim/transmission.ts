/**
 *
 * Equations from
 * Genikomsakis, K. N., & Mitrentsis, G. (2017). A computationally efficient simulation model for estimating energy consumption of electric vehicles in the context of route planning applications. Transportation Research Part D: Transport and Environment, 50, 98–118. https://doi.org/10.1016/j.trd.2016.10.014
 *
 *
 * https://reader.elsevier.com/reader/sd/pii/S1361920915302881?token=0963142177D36476367D34C6BA41C6BDDA082AB96D7D68817CE89AF499AC45A4FA3BC477E2D71FFB48C1E310DB5D73F3&originRegion=eu-west-1&originCreation=20230328104414
 *
 */

/**
 * angular motor speed in rad/s
 * @param u_angular motor speed in rad/s
 * @param r_wheel wheel radius in m
 * @returns linear motor speed in m/s
 */
export const omega_motor = ({
	g_ratio,
	u_angular,
	r_wheel,
}: {
	g_ratio: number;
	u_angular: number;
	r_wheel: number;
}): number => {
	const u_linear = u_angular * r_wheel;
	const f_ad = g_ratio * u_linear;
	return f_ad;
};

/**
 * mechanical power from the motor in Watts
 * @param traction_power power from the motor in Watts
 * @param n_gear gear efficiency of the transmission system
 * @returns mechanical power in Watts
 */
export const p_motor_out = ({
	traction_power,
	n_gear,
}: {
	traction_power: number;
	n_gear: number;
}): number => {
	if (traction_power < 0) {
		return traction_power * n_gear;
	} else {
		return traction_power / n_gear;
	}
};

/**
 * motor output torque in Nm
 * @param p_motor_out mechanical power from the motor in Watts
 * @param omega_motor_speed angular motor speed in rad/s
 * @returns motor output torque in Nm
 * @throws Error if omega_motor is zero
 */
export const t_motorout = ({
	p_motor_out,
	omega_motor_speed,
}: {
	p_motor_out: number;
	omega_motor_speed: number;
}): number => {
	if (omega_motor_speed === 0) {
		throw new Error('omega_motor_speed is zero');
	}
	return p_motor_out / omega_motor_speed;
};
