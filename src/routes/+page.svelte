<script lang="ts">
	import { browser } from '$app/environment';
	import { PUBLIC_THUNDERFOREST_API_KEY } from '$env/static/public';
	import { LeafletMap, TileLayer } from 'svelte-leafletjs?client';
	import type { Map } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';

	const mapOptions = {
		center: [55.55498175819643, 13.108723370558785],
		zoom: 11,
	};
	const tileUrl = `https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=${PUBLIC_THUNDERFOREST_API_KEY}`;
	// 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	const tileLayerOptions = {
		minZoom: 0,
		maxZoom: 20,
		maxNativeZoom: 19,
		attribution:
			'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
		// attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	};

	let leafletMap: { getMap(): Map };
	let L: Map;
	onMount(() => {
		// if (leafletMap) leafletMap?.controls.zoom.setPosition('topright');
		L = leafletMap.getMap();
		L.zoomControl.setPosition('topright');
	});
</script>

<svelte:head>
	<title>EV Routing with Charging Prices</title>
</svelte:head>

<div id="map" style="height: 100vh;">
	{#if browser}
		<LeafletMap bind:this={leafletMap} options={mapOptions}>
			<TileLayer url={tileUrl} options={tileLayerOptions} />
		</LeafletMap>
	{/if}
</div>
