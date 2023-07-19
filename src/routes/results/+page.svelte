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
	let showOrigins = false;
	let showDestinations = false;
	let showRoutes = false;

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
					{#if hovered[run.id] || showOrigins}
						<Marker latLng={[run.origin.latitude, run.origin.longitude]}>
							<DivIcon options={{ html: originIcon }} />
						</Marker>
					{/if}
					{#if hovered[run.id] || showDestinations}
						<Marker latLng={[run.destination.latitude, run.destination.longitude]}>
							<DivIcon options={{ html: destinationIcon }} />
						</Marker>
					{/if}
					<!-- <Polyline latLngs={run.route.geometry.coordinates} color="#d33" opacity={0.5} /> -->
					{#if showRoutes}
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
					{/if}
				{/each}
			</LeafletMap>
		{/if}
	</div>

	<div id="filters" class="absolute left-0 top-0 z-10 w-64 p-3">
		<div class="isolate -space-y-px rounded-md">
			<form class="relative rounded-md bg-white p-3">
				<fieldset>
					<div class="space-y-5">
						<div class="relative flex items-start">
							<div class="flex h-6 items-center">
								<input
									id="comments"
									aria-describedby="comments-description"
									name="comments"
									type="checkbox"
									bind:checked={showOrigins}
									class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
								/>
							</div>
							<div class="ml-3 text-sm leading-6">
								<label for="comments" class="font-medium text-gray-900">Show Origins</label>
							</div>
						</div>
						<div class="relative flex items-start">
							<div class="flex h-6 items-center">
								<input
									id="candidates"
									aria-describedby="candidates-description"
									name="candidates"
									type="checkbox"
									bind:checked={showDestinations}
									class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
								/>
							</div>
							<div class="ml-3 text-sm leading-6">
								<label for="candidates" class="font-medium text-gray-900">Show Destinations</label>
							</div>
						</div>
						<div class="relative flex items-start">
							<div class="flex h-6 items-center">
								<input
									id="offers"
									aria-describedby="offers-description"
									name="offers"
									type="checkbox"
									bind:checked={showRoutes}
									class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
								/>
							</div>
							<div class="ml-3 text-sm leading-6">
								<label for="offers" class="font-medium text-gray-900">Show Routes</label>
							</div>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	</div>
</main>
