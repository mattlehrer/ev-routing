import type { PageLoad } from './$types';

export const load = (async ({ url }) => {
	const searchParams = url.searchParams;
	const olatParam = searchParams.get('olat');
	const olonParam = searchParams.get('olon');
	const dlatParam = searchParams.get('dlat');
	const dlonParam = searchParams.get('dlon');
	return {
		olat: olatParam && Number(JSON.parse(decodeURI(olatParam || ''))),
		olon: olonParam && Number(JSON.parse(decodeURI(olonParam || ''))),
		dlat: dlatParam && Number(JSON.parse(decodeURI(dlatParam || ''))),
		dlon: dlonParam && Number(JSON.parse(decodeURI(dlonParam || ''))),
	};
}) satisfies PageLoad;
