import OSRM from '@project-osrm/osrm';
import type { RequestHandler } from './$types';

const osrm = new OSRM('osmdata/sweden-latest.osrm');

export const GET: RequestHandler = async () => {
	return new Response();
};
