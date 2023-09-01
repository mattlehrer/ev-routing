import { PUBLIC_THUNDERFOREST_API_KEY } from '$env/static/public';

export const mapOptions = {
	center: [58.83, 14.8],
	zoom: 7,
	// preferCanvas: true,
};
// const tileUrl = `https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=${PUBLIC_THUNDERFOREST_API_KEY}`; // shows some elevation details
export const tileUrl = `https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=${PUBLIC_THUNDERFOREST_API_KEY}`;
// export const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const tileLayerOptions = {
	minZoom: 0,
	maxZoom: 20,
	maxNativeZoom: 19,
	attribution:
		'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
	// attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};
