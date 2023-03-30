<script lang="ts">
	import { browser } from '$app/environment';
	import { PUBLIC_THUNDERFOREST_API_KEY } from '$env/static/public';
	import { GeoJSON, LeafletMap, Marker, DivIcon, TileLayer } from 'svelte-leafletjs?client';
	import type { GeoJSONOptions, LatLng, Map } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import humanizeDuration from 'humanize-duration';
	import { onMount } from 'svelte';

	let origin: string | undefined;
	let destination: string | undefined;
	let originLatLng: [number, number];
	let destinationLatLng: [number, number];
	let routeData: any;

	function formatLatLng(latlng: LatLng) {
		return [
			(latlng.lat as number).toLocaleString(undefined, { maximumFractionDigits: 5 }),
			(latlng.lng as number).toLocaleString(undefined, { maximumFractionDigits: 5 }),
		].join(', ');
	}

	function formatDistance(distance: number) {
		return new Intl.NumberFormat(undefined, {
			style: 'unit',
			unit: 'kilometer',
			unitDisplay: 'short',
			maximumFractionDigits: 1,
		}).format(distance / 1000);
	}

	function formatDuration(duration: number) {
		return humanizeDuration(duration * 1000, { units: ['h', 'm'], round: true });
	}

	async function handleClick(e: any) {
		// console.log(e.detail.latlng);
		if (!origin) {
			origin = formatLatLng(e.detail.latlng);
			originLatLng = [e.detail.latlng.lat, e.detail.latlng.lng];
		} else {
			destination = formatLatLng(e.detail.latlng);
			destinationLatLng = [e.detail.latlng.lat, e.detail.latlng.lng];
		}
		if (origin && destination) {
			await getRoute();
		}
	}
	async function getRoute() {
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
		routeData = data;
		// console.log(routeData);
		console.log(data);
	}

	const mapOptions = {
		center: [58.83, 14.8],
		zoom: 6,
		// preferCanvas: true,
	};
	// const tileUrl = `https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=${PUBLIC_THUNDERFOREST_API_KEY}`; // shows some elevation details
	// const tileUrl = `https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=${PUBLIC_THUNDERFOREST_API_KEY}`;
	const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	const tileLayerOptions = {
		minZoom: 0,
		maxZoom: 20,
		maxNativeZoom: 19,
		// attribution:
		// 	'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
			// console.log('style', geoJsonFeature);
			return { color };
		},
		onEachFeature: function (feature: any, layer: any) {
			// console.log('onEachFeature', feature, layer);
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

	const pinIcon = (color: string) => `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="absolute w-10 h-10 -left-5 -top-10 ${color}">
	  <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
	</svg>
	`;

	const originIcon = pinIcon('text-green-700');
	const destinationIcon = pinIcon('text-red-700');
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
					<Marker latLng={originLatLng}>
						<DivIcon options={{ html: originIcon }} />
					</Marker>
				{/if}
				{#if destination}
					<Marker latLng={destinationLatLng}>
						<DivIcon options={{ html: destinationIcon }} />
					</Marker>
				{/if}
				{#if routeData?.geometry}
					<GeoJSON
						data={routeData.geometry}
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

	<div id="route" class="absolute left-0 top-0 z-10 w-64 p-3">
		<div class="isolate -space-y-px rounded-md shadow-sm">
			<div
				class="relative rounded-md rounded-b-none bg-white px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-gray-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-indigo-600"
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
						class="absolute right-2 top-2 text-red-500 opacity-30"
						on:click={() => {
							origin = undefined;
							routeData = undefined;
						}}
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
				class="relative rounded-md rounded-t-none bg-white px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-gray-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-indigo-600"
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
						class="absolute right-2 top-2 text-red-500 opacity-30"
						on:click={() => {
							destination = undefined;
							routeData = undefined;
						}}
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

			<div class="py-4">
				<div
					class="relative rounded-md bg-white px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-gray-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-indigo-600"
				>
					<p class="text-xs font-medium text-gray-900">Summary</p>
					<p class="py-2 text-sm">
						{#if routeData}
							{#if routeData?.legs?.[0].summary}
								<p>{routeData.legs[0].summary}</p>
							{/if}
							<p>{formatDistance(routeData.distance)}</p>
							<p>{formatDuration(routeData.duration)}</p>
						{:else}
							<p class="text-gray-400">Click the map to get started</p>
						{/if}
					</p>
				</div>
			</div>
		</div>
	</div>
</main>
