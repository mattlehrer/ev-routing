<script lang="ts">
	import { browser } from '$app/environment';
	import { PUBLIC_THUNDERFOREST_API_KEY } from '$env/static/public';
	import { GeoJSON, LeafletMap, Marker, DivIcon, TileLayer } from 'svelte-leafletjs?client';
	import type { GeoJSONOptions, LatLng, Map } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';

	let origin: string | undefined;
	let destination: string | undefined;
	let originLatLng: [number, number];
	let destinationLatLng: [number, number];
	let geoJsonData: any;

	function formatLatLng(latlng: LatLng) {
		return [
			(latlng.lat as number).toLocaleString(undefined, { maximumFractionDigits: 5 }),
			(latlng.lng as number).toLocaleString(undefined, { maximumFractionDigits: 5 }),
		].join(', ');
	}

	async function handleClick(e: any) {
		console.log(e.detail.latlng);
		if (!origin) {
			origin = formatLatLng(e.detail.latlng);
			originLatLng = [e.detail.latlng.lat, e.detail.latlng.lng];
		} else {
			destination = formatLatLng(e.detail.latlng);
			destinationLatLng = [e.detail.latlng.lat, e.detail.latlng.lng];
		}
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

	const mapOptions = {
		center: [58.83, 14.8],
		zoom: 6,
		// preferCanvas: true,
	};
	// const tileUrl = `https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=${PUBLIC_THUNDERFOREST_API_KEY}`; // shows some elevation details
	const tileUrl = `https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=${PUBLIC_THUNDERFOREST_API_KEY}`;
	// const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
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

	let color = '#0000ff';
	const geoJsonOptions = {
		style: function (geoJsonFeature: GeoJSONOptions) {
			console.log('style', geoJsonFeature);
			return { color };
		},
		onEachFeature: function (feature: any, layer: any) {
			console.log('onEachFeature', feature, layer);
		},
	};

	let pointer: [number, number] | undefined = undefined;

	const handleMouseOver = (e: CustomEvent) => {
		pointer = [e.detail.latlng.lat, e.detail.latlng.lng];
	};

	const handleMouseOut = (e: CustomEvent) => {
		setTimeout(() => {
			pointer = undefined;
		}, 1000);
	};
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
					<GeoJSON
						data={geoJsonData}
						options={geoJsonOptions}
						events={['mouseover', 'mouseout']}
						on:mouseover={handleMouseOver}
						on:mouseout={handleMouseOut}
					/>
					{#if pointer}
						<Marker latLng={pointer}>
							<DivIcon>
								<div class="-m-10 h-10 w-10 bg-white">Hello</div>
							</DivIcon>
						</Marker>
					{/if}
				{/if}
			</LeafletMap>
		{/if}
	</div>

	<div id="route" class="absolute top-0 left-0 z-10 w-64 p-3">
		<div class="isolate -space-y-px rounded-md shadow-sm">
			<div
				class="relative rounded-md rounded-b-none bg-white px-3 pt-2.5 pb-1.5 ring-1 ring-inset ring-gray-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-indigo-600"
			>
				<label for="origin" class="block text-xs font-medium text-gray-900">Origin</label>
				<input
					type="text"
					name="origin"
					id="origin"
					bind:value={origin}
					class="block w-full border-0 p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
					placeholder="Click the map to get started"
				/>
				{#if origin}
					<button
						class="absolute top-2 right-2 text-red-500 opacity-30"
						on:click={() => (origin = undefined)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="h-5 w-5"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				{/if}
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
					placeholder="Click the map to get started"
				/>
				{#if destination}
					<button
						class="absolute top-2 right-2 text-red-500 opacity-30"
						on:click={() => (destination = undefined)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="h-5 w-5"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>
</main>
