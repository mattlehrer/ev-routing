<script lang="ts">
	import { browser } from '$app/environment';
	import { GeoJSON, LeafletMap, Marker, DivIcon, TileLayer } from 'svelte-leafletjs?client';
	import { LatLng } from 'leaflet?client';
	import type { Map } from 'leaflet?client';
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import {
		formatDistance,
		formatDuration,
		formatLatLng,
		formatPower,
		formatStationInfo,
	} from '$lib/utils/formatters';
	import { pinIcon } from '$lib/assets/pin';
	import { mapOptions, tileLayerOptions, tileUrl } from '$lib/map';
	import type { Route, RouteStep } from '$lib/route';
	import type { ChargingStationAPIRouteResponse } from '$lib/charging_stations';
	import { evcsIcon } from '$lib/assets/charging_station_symbol';

	export let data: {
		olat: number;
		olon: number;
		dlat: number;
		dlon: number;
		route: Route | undefined;
		totalPower: number;
		streamed:
			| {
					stationData: ChargingStationAPIRouteResponse;
			  }
			| undefined;
	};

	let ready = false;
	let origin: string | undefined;
	let destination: string | undefined;
	let originLatLng: [number, number] | undefined;
	let destinationLatLng: [number, number] | undefined;
	$: routeData = data.route;
	$: totalPower = data.totalPower;
	let hoveredStep: RouteStep | undefined;
	let hoveredStepLonLat: [number, number] | undefined;

	async function handleClick(e: CustomEvent) {
		// console.log(e.detail.latlng);
		if (!origin) {
			origin = formatLatLng(e.detail.latlng);
			originLatLng = [e.detail.latlng.lat, e.detail.latlng.lng];
		} else if (!destination) {
			destination = formatLatLng(e.detail.latlng);
			destinationLatLng = [e.detail.latlng.lat, e.detail.latlng.lng];
		}
	}

	async function handleStepHover(step: RouteStep) {
		hoveredStep = step;
		const [lat, lon] = hoveredStep.maneuver.location;
		hoveredStepLonLat = [lon, lat];
		if (hoveredStep) L.panTo([lon, lat], { duration: 0.5 });
	}

	let leafletMap: { getMap(): Map };
	let L: Map;

	onMount(() => {
		L = leafletMap.getMap();
		L.zoomControl.setPosition('topright');

		if (data) {
			console.log({ data });
			if (data.olat && data.olon) {
				originLatLng = [data.olat, data.olon];
				origin = formatLatLng(new LatLng(data.olat, data.olon));
			}
			if (data.dlat && data.dlon) {
				destinationLatLng = [data.dlat, data.dlon];
				destination = formatLatLng(new LatLng(data.dlat, data.dlon));
			}
		}
		if (originLatLng && destinationLatLng) {
			L.fitBounds([originLatLng, destinationLatLng]);
		}
		ready = true;
	});

	$: if (ready && originLatLng) {
		const url = new URL(window.location.href);
		const [olat, olon] = originLatLng;
		url.searchParams.set('olat', encodeURI(JSON.stringify(olat)));
		url.searchParams.set('olon', encodeURI(JSON.stringify(olon)));
		history.pushState({}, '', url);
	}
	$: if (ready && !originLatLng) {
		const url = new URL(window.location.href);
		url.searchParams.delete('olat');
		url.searchParams.delete('olon');
		history.pushState({}, '', url);
	}
	$: if (ready && destinationLatLng) {
		const url = new URL(window.location.href);
		const [dlat, dlon] = destinationLatLng;
		url.searchParams.set('dlat', encodeURI(JSON.stringify(dlat)));
		url.searchParams.set('dlon', encodeURI(JSON.stringify(dlon)));
		history.pushState({}, '', url);
	}
	$: if (ready && !destinationLatLng) {
		const url = new URL(window.location.href);
		url.searchParams.delete('dlat');
		url.searchParams.delete('dlon');
		history.pushState({}, '', url);
	}

	let pointer: [number, number] | undefined = undefined;

	const handleMouseOver = (e: CustomEvent) => {
		pointer = [e.detail.latlng.lat, e.detail.latlng.lng];
	};

	const handleMouseOut = () => {
		setTimeout(() => {
			pointer = undefined;
		}, 1000);
	};

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
						events={['mouseover', 'mouseout']}
						on:mouseover={handleMouseOver}
						on:mouseout={handleMouseOut}
					/>
					<!-- {#if pointer}
						<Marker latLng={pointer}>
							<DivIcon>
								<div class="-m-10 h-10 w-10 bg-white">Hello</div>
							</DivIcon>
						</Marker>
					{/if} -->
					{#if hoveredStep}
						<GeoJSON
							data={hoveredStep.geometry}
							options={{ color: 'red', opacity: 0.65 }}
							events={['mouseover', 'mouseout']}
						/>
					{/if}
				{/if}
				{#await data.streamed?.stationData}
					<div
						class="absolute left-64 top-3 z-[10000] ml-4 rounded-md border border-green-700 bg-white bg-opacity-70 px-8 py-3 text-lg"
					>
						Loading charging station data...
					</div>
				{:then json}
					{@const stations = json?.stations ?? []}
					{#each stations as station}
						<Marker
							latLng={[station.location.latitude, station.location.longitude]}
							options={{ title: formatStationInfo(station), bubblingMouseEvents: false }}
						>
							<DivIcon options={{ html: evcsIcon('text-green-500') }} />
						</Marker>
					{/each}
				{/await}
			</LeafletMap>
		{/if}
	</div>

	<div id="route" class="absolute left-0 top-0 z-10 w-64 p-3">
		<div class="isolate -space-y-px rounded-md">
			<form
				method="POST"
				use:enhance={() => {
					return async ({ update }) => {
						await update({ reset: false });
					};
				}}
			>
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
								originLatLng = undefined;
								data.route = undefined;
								routeData = undefined;
								data.streamed = undefined;
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
					class="relative bg-white px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-gray-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-indigo-600"
				>
					<label for="destination" class="block text-xs font-medium text-gray-900"
						>Destination</label
					>
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
								destinationLatLng = undefined;
								data.route = undefined;
								routeData = undefined;
								data.streamed = undefined;
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
				<input type="hidden" name="originLatLng" value={JSON.stringify(originLatLng)} />
				<input type="hidden" name="destinationLatLng" value={JSON.stringify(destinationLatLng)} />

				<button
					class="w-full rounded-md rounded-t-none bg-green-700 px-8 py-3 text-gray-50"
					type="submit">Get Route</button
				>
			</form>

			<div class="max-h-full py-4">
				<div
					class="relative max-h-[80vh] overflow-y-scroll rounded-md bg-white bg-opacity-70 px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-gray-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-indigo-600"
				>
					<h2 class="text-xs font-medium text-gray-900">Summary</h2>
					<div class="py-2 text-sm">
						{#if routeData}
							<div class="text-base">
								{#if routeData?.legs?.[0].summary}
									<p>{routeData.legs[0].summary}</p>
								{/if}
								<p>
									{routeData.legs[0].annotation.distance.reduce((a, c) => a + c).toFixed(2)} m
								</p>
								<p>
									{routeData.legs[0].annotation.duration.reduce((a, c) => a + c).toFixed(2)} s
								</p>
								<!-- <p>
									{formatDistance(routeData.legs[0].annotation.distance.reduce((a, c) => a + c))}
								</p>
								<p>
									{formatDuration(routeData.legs[0].annotation.duration.reduce((a, c) => a + c))}
								</p> -->
								{#if totalPower}
									<p>{formatPower(totalPower)}</p>
								{/if}
								{#each routeData.legs as leg}
									<div class="mt-8">
										<!-- <h3 class="text-base">
										{leg.summary}: {formatDistance(leg.distance)} ({formatDuration(leg.duration)})
									</h3> -->
										{#each leg.steps as step}
											<div
												on:mouseover={() => handleStepHover(step)}
												on:focus={() => handleStepHover(step)}
												on:mouseout={() => (hoveredStepLonLat = undefined)}
												on:blur={() => (hoveredStepLonLat = undefined)}
												class="mt-2 text-sm hover:-mx-3 hover:bg-red-500 hover:bg-opacity-30 hover:px-3"
											>
												<p>
													{step.maneuver.type}
													{step.maneuver.modifier ?? ''}
												</p>
												<p>{step.name} for {formatDistance(step.distance)}</p>
												{#if step.power}
													<p>using {formatPower(step.power)}</p>
												{/if}
												<p>
													in {step.duration.toFixed(1)} seconds
												</p>
											</div>
										{/each}
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-400">Click the map to get started</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</main>
