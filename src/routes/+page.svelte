<script lang="ts">
	import { browser } from '$app/environment';
	import { PUBLIC_THUNDERFOREST_API_KEY } from '$env/static/public';
	import { GeoJSON, LeafletMap, Marker, TileLayer } from 'svelte-leafletjs?client';
	import type { Map } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';

	let origin: string;
	let destination: string;
	let originLatLng: [number, number];
	let destinationLatLng: [number, number];
	let geoJsonData: any;

	async function handleClick(e: any) {
		console.log(e.detail.latlng);
		if (!origin) {
			origin = [e.detail.latlng.lat, e.detail.latlng.lng].join(',');
			originLatLng = [e.detail.latlng.lat, e.detail.latlng.lng];
		} else {
			destinationLatLng = [e.detail.latlng.lat, e.detail.latlng.lng];
			destination = [e.detail.latlng.lat, e.detail.latlng.lng].join(',');
			const res = await fetch('/api/route', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					origin: originLatLng,
					destination: destinationLatLng,
				}),
			});
			const data = await res.json();
			geoJsonData = data.geometry;
			// console.log(geoJsonData);
			console.log(data);
			// geoJsonData = data;
		}
	}

	const mapOptions = {
		center: [58.83, 14.8],
		zoom: 6,
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

<main class="relative">
	<div id="map" style="height: 100vh; position: relative;" class="z-0">
		{#if browser}
			<LeafletMap
				bind:this={leafletMap}
				options={mapOptions}
				events={['click']}
				on:click={handleClick}
			>
				<TileLayer url={tileUrl} options={tileLayerOptions} />
				{#if origin}
					<Marker latLng={originLatLng} />
				{/if}
				{#if destination}
					<Marker latLng={destinationLatLng} />
				{/if}
				{#if geoJsonData}
					<GeoJSON data={geoJsonData} />
				{/if}
			</LeafletMap>
		{/if}
	</div>

	<div id="route" class="absolute top-0 left-0 z-10 w-80 p-3">
		<div class="isolate -space-y-px rounded-md shadow-sm">
			<div
				class="relative rounded-md rounded-b-none bg-white px-3 pt-2.5 pb-1.5 ring-1 ring-inset ring-gray-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-indigo-600 "
			>
				<label for="origin" class="block text-xs font-medium text-gray-900">Origin</label>
				<input
					type="text"
					name="origin"
					id="origin"
					bind:value={origin}
					class="block w-full border-0 p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
					placeholder="Origin"
				/>
			</div>
			<div
				class="relative rounded-md rounded-t-none bg-white px-3 pt-2.5 pb-1.5 ring-1 ring-inset ring-gray-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-indigo-600"
			>
				<label for="destination" class="block text-xs font-medium text-gray-900">Destination</label>
				<input
					type="text"
					name="destination"
					id="destination"
					bind:value={destination}
					class="block w-full border-0 p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
					placeholder="Destination"
				/>
			</div>
		</div>
	</div>
</main>
