import type { ChargingStationAPIRouteResponse } from '$lib/charging_stations';
import humanizeDuration from 'humanize-duration';
import type { LatLng } from 'leaflet';

export function formatLatLng(latlng: LatLng) {
	return [
		(latlng.lat as number).toLocaleString(undefined, { maximumFractionDigits: 5 }),
		(latlng.lng as number).toLocaleString(undefined, { maximumFractionDigits: 5 }),
	].join(', ');
}

export function formatDistance(distance: number) {
	return new Intl.NumberFormat(undefined, {
		style: 'unit',
		unit: 'kilometer',
		unitDisplay: 'short',
		maximumFractionDigits: 1,
	}).format(distance / 1000);
}

export function formatDuration(duration: number) {
	return humanizeDuration(duration * 1000, { units: ['h', 'm'], round: true });
}

export function formatPower(wH: number) {
	return (
		new Intl.NumberFormat(undefined, {
			style: 'decimal',
			unitDisplay: 'short',
			maximumFractionDigits: 1,
		}).format(wH) + ' Wh'
	);
}

export function formatStationInfo(station: ChargingStationAPIRouteResponse['stations'][number]) {
	return `${station.title}\nFastest charger is ${station.maxCapacity} kW`;
}
