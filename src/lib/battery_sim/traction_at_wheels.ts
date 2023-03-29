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
 * force of aerodynamic drag in Newtons
 * @param rho density of air in kg/m^3
 * @param c_d drag coefficient
 * @param area frontal area in m^2
 * @param v velocity in m/s
 * @returns force of aerodynamic drag in Newtons
 */
export const f_ad = ({
	rho = 1.225, // density of air in kg/m^3 at 15C
	c_d = 0.315,
	area = 2.755,
	v = 0,
}: {
	rho?: number; // density of air in kg/m^3
	c_d?: number; // drag coefficient
	area?: number; // frontal area in m^2
	v?: number; // velocity in m/s
}): number => {
	return 0.5 * rho * c_d * area * v ** 2;
};

/**
 * force of rolling resistance in Newtons
 * @param mu_rr rolling resistance coefficient
 * @param m mass in kg
 * @param g gravitational acceleration in m/s^2
 * @param theta slope angle in radians
 * @returns force of rolling resistance in Newtons
 */
export const f_rr = ({
	mu_rr = 0.01,
	m = 1500,
	g = 9.81,
	theta = 0,
}: {
	mu_rr?: number; // rolling resistance coefficient
	m?: number; // mass in kg
	g?: number; // gravitational acceleration in m/s^2
	theta?: number; // slope angle in radians
}): number => {
	return mu_rr * m * g * Math.cos(theta);
};

/**
 * hill climbing force in Newtons
 * @param m mass in kg
 * @param g gravitational acceleration in m/s^2
 * @param theta slope angle in radians
 * @returns hill climbing force in Newtons
 */
export const f_hc = ({
	m = 1500,
	g = 9.81,
	theta = 0,
}: {
	m?: number; // mass in kg
	g?: number; // gravitational acceleration in m/s^2
	theta?: number; // slope angle in radians
}): number => {
	return m * g * Math.sin(theta);
};

/**
 * force of linear acceleration in Newtons
 * @param m mass in kg
 * @param a acceleration in m/s^2
 * @returns force of linear acceleration in Newtons
 */
export const f_la = ({
	m = 1500,
	a = 0,
}: {
	m?: number; // mass in kg
	a?: number; // acceleration in m/s^2
}): number => {
	return m * a;
};

/**
 * inertial force in Newtons
 * @param c_i mass correction factor for rotational inertia acceleration
 * @param m mass in kg
 * @param a acceleration in m/s^2
 * @returns inertial force in Newtons
 */
export const f_omega_a = ({
	c_i = 0.05,
	m = 1500,
	a = 0,
}: {
	c_i?: number; // mass correction factor for rotational inertia acceleration
	m?: number; // mass in kg
	a?: number; // acceleration in m/s^2
}): number => {
	return c_i * m * a;
};

/**
 * total tractive effort at the wheels in Newtons
 * @param f_ad force of erodynamic drag in Newtons
 * @param f_rr force of rolling resistance in Newtons
 * @param f_hc hill climbing force in Newtons
 * @param f_la force of linear acceleration in Newtons
 * @param f_omega_a inertial force in Newtons
 * @returns total tractive effort at the wheels in Newtons
 */
export const f_te = ({
	f_ad,
	f_rr,
	f_hc,
	f_la,
	f_omega_a,
}: {
	f_ad: number; // force of aerodynamic drag in Newtons
	f_rr: number; // force of rolling resistance in Newtons
	f_hc: number; // hill climbing force in Newtons
	f_la: number; // force of linear acceleration in Newtons
	f_omega_a: number; // inertial force in Newtons
}): number => {
	return f_ad + f_rr + f_hc + f_la + f_omega_a;
};

/**
 * The traction power to drive the vehicle at speed u in Watts
 * @param f_te total tractive effort at the wheels in Newtons
 * @param u car velocity in m/s
 * @returns traction power at the wheels in Watts
 */
export const p_te = ({
	f_te,
	u,
}: {
	f_te: number; // traction power at the wheels in Newtons
	u: number; // car velocity in m/s
}): number => {
	return f_te * u;
};
