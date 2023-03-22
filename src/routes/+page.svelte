<script>
	import { browser } from '$app/environment';
	import { LeafletMap, TileLayer } from 'svelte-leafletjs?client';
	import 'leaflet/dist/leaflet.css';

	const mapOptions = {
		center: [55.55498175819643, 13.108723370558785],
		zoom: 11,
	};
	const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	const tileLayerOptions = {
		minZoom: 0,
		maxZoom: 20,
		maxNativeZoom: 19,
		attribution: '© OpenStreetMap contributors',
	};
</script>

<div id="map" style="height: 100vh;">
	{#if browser}
		<LeafletMap options={mapOptions}>
			<TileLayer url={tileUrl} options={tileLayerOptions} />
		</LeafletMap>
	{/if}
</div>
