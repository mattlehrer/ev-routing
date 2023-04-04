import type { Vehicle } from '$lib/vehicle';
import {
	calc_efficiency,
	calc_norm_factor,
	calc_p_battery_out,
	calc_p_motor_in,
	calc_regen_factor,
	p_total,
} from './motor';
import {
	calc_f_ad,
	calc_f_hc,
	calc_f_la,
	calc_f_omega_a,
	calc_f_rr,
	calc_f_te,
	calc_p_te,
} from './traction_at_wheels';
import { calc_p_motor_out } from './transmission';

/**
 * calculate the energy consumption for a route segment
 * @param distance the distance of the segment in meters
 * @param duration the duration of the segment in seconds
 * @param elevation_start the elevation at the start of the segment in meters
 * @param elevation_end the elevation at the end of the segment in meters
 * @param vehicle the vehicle to calculate the energy consumption for
 * @param density_of_air the density of air in kg/m^3
 * @returns the energy consumption for the segment in Wh
 */
export const calc_route_segment_battery_power_flow = ({
	distance,
	duration,
	elevation_start,
	elevation_end,
	vehicle,
	density_of_air,
}: {
	distance: number;
	duration: number;
	elevation_start: number;
	elevation_end: number;
	vehicle: Vehicle;
	density_of_air: number;
}): number => {
	if (duration === 0) return 0;

	// calculate the average speed for the segment
	const v = distance / duration;

	// calculate the average slope angle for the segment in radians
	const slope_angle = Math.atan((elevation_end - elevation_start) / distance);

	// calculate the total tractive effor at the wheels in Newtonws
	const aerodynamic_drag_force = calc_f_ad({
		rho: density_of_air,
		c_d: vehicle.drag_coefficient,
		area: vehicle.frontal_area,
		v,
	});

	const rolling_resistance_force = calc_f_rr({
		mu_rr: vehicle.rolling_resistance_coefficient,
		m: vehicle.mass,
		theta: slope_angle,
	});

	const hill_climbing_force = calc_f_hc({
		m: vehicle.mass,
		theta: slope_angle,
	});

	const linear_acceleration_force = calc_f_la({
		m: vehicle.mass,
		a: 0,
	});

	const inertial_force = calc_f_omega_a({
		c_i: vehicle.mass_correction_factor,
		m: vehicle.mass,
		a: 0,
	});

	const traction_force = calc_f_te({
		f_ad: aerodynamic_drag_force,
		f_rr: rolling_resistance_force,
		f_hc: hill_climbing_force,
		f_la: linear_acceleration_force,
		f_omega_a: inertial_force,
	});

	const traction_power = calc_p_te({
		f_te: traction_force,
		u: v,
	});

	// calculate the motor output power in Watts
	const motor_out_power = calc_p_motor_out({
		traction_power,
		n_gear: vehicle.gear_efficiency,
	});

	const regen_factor = calc_regen_factor({
		u: v,
		u1: vehicle.u1,
		u2: vehicle.u2,
	});

	const efficiency = calc_efficiency({
		p_motor_out: motor_out_power,
		p_motor_rated: vehicle.p_motor_rated,
		motor_type: vehicle.motor_type,
	});

	const norm_factor = calc_norm_factor(vehicle.p_motor_rated);

	const motor_in_power = calc_p_motor_in({
		p_motor_out: motor_out_power,
		regen_factor,
		efficiency,
		norm_factor,
		p_te: traction_power,
	});

	const p_battery_out = calc_p_battery_out({
		p_motor_in: motor_in_power,
		p_ac: vehicle.accessory_power_draw,
	});

	const battery_power_flow_in_wH = p_total({
		p_battery_out,
		rte: vehicle.rte,
	});

	// console.log({
	// 	v,
	// 	traction_force,
	// 	traction_power,
	// 	motor_out_power,
	// 	motor_in_power,
	// 	p_battery_out,
	// 	regen_factor,
	// 	efficiency,
	// 	norm_factor,
	// 	battery_power_flow_in_wH,
	// });

	return (duration * battery_power_flow_in_wH) / 3600;
};
