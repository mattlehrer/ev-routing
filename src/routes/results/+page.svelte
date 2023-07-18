<script lang="ts">
	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import {
		GeoJSON,
		LeafletMap,
		Marker,
		DivIcon,
		TileLayer,
		Polyline,
		Popup,
	} from 'svelte-leafletjs?client';
	import { LatLng } from 'leaflet?client';
	import type { Map } from 'leaflet?client';
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';
	import { pinIcon } from '$lib/assets/pin';
	import { mapOptions, tileLayerOptions, tileUrl } from '$lib/map';

	const originIcon = pinIcon('text-green-700');
	const destinationIcon = pinIcon('text-red-700');

	export let data: PageData;
	let ready = false;

	let leafletMap: { getMap(): Map };
	let L: Map;

	onMount(() => {
		L = leafletMap.getMap();
		L.zoomControl.setPosition('topright');

		if (data) {
			console.log({ data });
		}
		ready = true;
	});
</script>

<main class="relative">
	<div id="map" style="height: 100vh; position: relative;" class="z-0">
		{#if browser}
			<LeafletMap bind:this={leafletMap} options={mapOptions}>
				<TileLayer url={tileUrl} options={tileLayerOptions} />

				{#each data.routes as run}
					<!-- <Marker latLng={[run.origin.latitude, run.origin.longitude]}>
						<DivIcon options={{ html: originIcon }} />
					</Marker>
					<Marker latLng={[run.destination.latitude, run.destination.longitude]}>
						<DivIcon options={{ html: destinationIcon }} />
					</Marker> -->
					<Polyline
						latLngs={run.route.geometry.coordinates}
						color={run.optimizedDuration ? '#3d3' : '#d33'}
					/>
				{/each}
			</LeafletMap>
		{/if}
	</div>
</main>
