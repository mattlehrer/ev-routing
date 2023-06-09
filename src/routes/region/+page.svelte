<script lang="ts">
	// this is the region of Sweden that is included in the experiment

	import { GeoJSON, LeafletMap, TileLayer } from 'svelte-leafletjs?client';
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';
	import RegionGEOJson from '$lib/sweden_geojson/sweden_minus_north_regions.geojson.json';
	import { browser } from '$app/environment';
	import { PUBLIC_THUNDERFOREST_API_KEY } from '$env/static/public';

	let geoJsonData: GeoJSON;

	onMount(async () => {
		geoJsonData = RegionGEOJson;
	});

	const mapOptions = {
		center: [58, 14.75],
		zoom: 7,
	};
	const tileUrl = `https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=${PUBLIC_THUNDERFOREST_API_KEY}`;
	// const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	const tileLayerOptions = {
		minZoom: 0,
		maxZoom: 20,
		maxNativeZoom: 19,
		attribution:
			'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
	};
</script>

{#if browser}
	<div id="map" style="height: 100vh; position: relative;" class="z-0">
		<LeafletMap options={mapOptions}>
			<TileLayer url={tileUrl} options={tileLayerOptions} />
			<GeoJSON data={geoJsonData} />
		</LeafletMap>
	</div>
{/if}
