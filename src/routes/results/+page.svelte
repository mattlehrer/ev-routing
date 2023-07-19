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
	const hovered: { [key: string]: boolean } = {};

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
					{#if hovered[run.id]}
						<Marker latLng={[run.origin.latitude, run.origin.longitude]}>
							<DivIcon options={{ html: originIcon }} />
						</Marker>
						<Marker latLng={[run.destination.latitude, run.destination.longitude]}>
							<DivIcon options={{ html: destinationIcon }} />
						</Marker>
					{/if}
					<!-- <Polyline latLngs={run.route.geometry.coordinates} color="#d33" opacity={0.5} /> -->
					<div class={hovered[run.id] ? 'z-[1000]' : ''}>
						<Polyline
							latLngs={run.route.geometry.coordinates}
							color={run.optimizedDuration ? '#3d3' : '#d33'}
							opacity={hovered[run.id] ? 1 : 0.25}
							weight={hovered[run.id] ? 5 : 3}
							events={['mouseout', 'mouseover']}
							on:mouseout={() => {
								hovered[run.id] = false;
							}}
							on:mouseover={() => {
								hovered[run.id] = true;
							}}
						/>
					</div>
				{/each}
			</LeafletMap>
		{/if}
	</div>
</main>
