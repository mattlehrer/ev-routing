export type Vehicle = {
	mass: number;
	frontal_area: number;
	drag_coefficient: number;
	rolling_resistance_coefficient: number;
	mass_correction_factor: number;
	accessory_power_draw: number;

	// motor
	motor_type: MotorType;
	p_motor_rated: number; // rate power in kW
	norm_factor: number;

	// battery
	battery_capacity: number;
	rte: number;

	// regen speed bounds
	u1: number;
	u2: number;

	// transmission
	gear_efficiency: number;
};

export type MotorType = 'induction_motor' | 'permanent_magnet_motor';
