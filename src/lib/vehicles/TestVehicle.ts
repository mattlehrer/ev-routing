/**
 *
 * Stats from
 * Genikomsakis, K. N., & Mitrentsis, G. (2017). A computationally efficient simulation model for estimating energy consumption of electric vehicles in the context of route planning applications. Transportation Research Part D: Transport and Environment, 50, 98–118. https://doi.org/10.1016/j.trd.2016.10.014
 *
 *
 * https://reader.elsevier.com/reader/sd/pii/S1361920915302881?token=0963142177D36476367D34C6BA41C6BDDA082AB96D7D68817CE89AF499AC45A4FA3BC477E2D71FFB48C1E310DB5D73F3&originRegion=eu-west-1&originCreation=20230328104414
 *
 */

import { calc_norm_factor } from '$lib/battery_sim/motor';
import type { Vehicle } from '$lib/vehicle';

const p_motor_rated = 80; // kW
const norm_factor = calc_norm_factor(p_motor_rated);

export const TestVehicle: Vehicle = {
	mass: 1663,
	frontal_area: 2.19,
	drag_coefficient: 0.29,
	rolling_resistance_coefficient: 0.008,
	mass_correction_factor: 0.05,
	accessory_power_draw: 300.0,

	// motor
	motor_type: 'induction_motor',
	p_motor_rated,
	norm_factor,

	// battery
	battery_capacity: 24, // 24 kWh
	rte: 0.95,

	// regen speed bounds
	u1: 1.39, // 1.39 m/s = 5 km/h
	u2: 4.72, // 4.72 m/s = 17 km/h

	// transmission
	gear_efficiency: 0.97,
};
