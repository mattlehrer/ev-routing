import type { ChargingStationAPILatLonResponse } from './charging_stations';
import type { LatLonPair } from './lat_lon';

export const placeData = new Map<LatLonPair, ChargingStationAPILatLonResponse>();
