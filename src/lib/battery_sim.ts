/**
 *
 * Equations from
 * Genikomsakis, K. N., & Mitrentsis, G. (2017). A computationally efficient simulation model for estimating energy consumption of electric vehicles in the context of route planning applications. Transportation Research Part D: Transport and Environment, 50, 98–118. https://doi.org/10.1016/j.trd.2016.10.014
 *
 *
 * https://reader.elsevier.com/reader/sd/pii/S1361920915302881?token=0963142177D36476367D34C6BA41C6BDDA082AB96D7D68817CE89AF499AC45A4FA3BC477E2D71FFB48C1E310DB5D73F3&originRegion=eu-west-1&originCreation=20230328104414
 *
 */

export const energyConsumption = ({
	n_gear,
	n_gen,
	p_motorout,
	regen_factor,
	norm_factor,
	p_ac,
	rte,
	p_battery_out,
}: {
	n_gear: number;
	n_gen: number;
	p_motorout: number;
	regen_factor: number;
	norm_factor: number;
	p_ac: number;
	rte: number;
	p_battery_out: number;
}): number => {
	const p_te = 0;

	if (p_te < 0) {
		if (p_battery_out < 0) {
			return 0;
		} else {
			return 0;
		}
	} else {
		return 0;
	}
};

// force of erodynamic drag
export const f_ad = ({
	rho = 1.225, // density of air in kg/m^3 at 15C
	c_d = 0.315,
	area = 2.755,
	v = 0,
}: {
	rho?: number; // density of air in kg/m^3
	c_d?: number; // drag coefficient
	area?: number; // frontal area in m^2
	v: number; // velocity in m/s
}): number => {
	return 0.5 * rho * c_d * area * v ** 2;
};

// force of rolling resistance
export const f_rr = ({
	mu_rr = 0.01,
	m = 1500,
	g = 9.81,
	theta = 0,
}: {
	mu_rr?: number; // rolling resistance coefficient
	m: number; // mass in kg
	g?: number; // gravitational acceleration in m/s^2
	theta?: number; // slope angle in radians
}): number => {
	return mu_rr * m * g * Math.cos(theta);
};

// hill climbing force
export const f_hc = ({
	m = 1500,
	g = 9.81,
	theta = 0,
}: {
	m: number; // mass in kg
	g?: number; // gravitational acceleration in m/s^2
	theta?: number; // slope angle in radians
}): number => {
	return m * g * Math.sin(theta);
};

// force of linear acceleration
export const f_la = ({
	m = 1500,
	a = 0,
}: {
	m: number; // mass in kg
	a?: number; // acceleration in m/s^2
}): number => {
	return m * a;
};

// inertial force
export const f_omega_a = ({
	c_i = 0.05,
	m = 1500,
	a = 0,
}: {
	c_i: number; // mass correction factor for rotational inertia acceleration
	m: number; // mass in kg
	a?: number; // acceleration in m/s^2
}): number => {
	return c_i * m * a;
};
