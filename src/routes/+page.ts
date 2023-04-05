import type { PageLoad } from './$types';

export const load = (async ({ url }) => {
	const searchParams = url.searchParams;
	console.log({ searchParams });
	const originParam = searchParams.get('origin');
	// const origin = JSON.parse(decodeURI(originParam || ''));
	const destinationParam = searchParams.get('destination');
	// const destination = JSON.parse(decodeURI(destinationParam || ''));
	return {
		origin: originParam && JSON.parse(decodeURI(originParam || '')),
		destination: destinationParam && JSON.parse(decodeURI(destinationParam || '')),
	};
}) satisfies PageLoad;
