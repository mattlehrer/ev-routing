<script lang="ts">
	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import { LeafletMap, Marker, DivIcon, TileLayer, Polyline } from 'svelte-leafletjs?client';
	import type { Map } from 'leaflet?client';
	import 'leaflet/dist/leaflet.css';
	import { onMount, tick } from 'svelte';
	import { mapOptions, tileLayerOptions, tileUrl } from '$lib/map';
	import { downRightIcon, upRightIcon } from '$lib/assets/results_icons';
	import { formatDistance, formatPowerKwH } from '$lib/utils/formatters';

	const originIcon = upRightIcon('text-green-700');
	const destinationIcon = downRightIcon('text-red-700');

	export let data: PageData;
	let showOrigins = false;
	let showDestinations = false;
	let showRoutes = true;
	let successType: 'both' | 'completed' | 'overflow' = 'both';
	let routes = data.routes;

	$: filterRoutes(successType);

	let leafletMap: { getMap(): Map };
	let L: Map;
	const hovered: { [key: string]: boolean } = {};
	const highlighted: {
		lineGeometry: any;
		distance?: string;
		totalPower?: string;
		optimizedCost?: number;
		optimizedCostDuration?: number;
		optimizedDurationFinancialCost?: number;
		optimizedDuration?: number;
	} = { lineGeometry: undefined };

	onMount(() => {
		L = leafletMap.getMap();
		L.zoomControl.setPosition('topright');

		if (data) {
			console.log({ data });
		}

		const completedRoutes = data.routes.filter((r) => r.optimizedDuration);
		let i = 0;
		const max = completedRoutes.length - 1;
		const interval = setInterval(() => {
			highlighted.lineGeometry = completedRoutes[i % max].route.geometry.coordinates;
			highlighted.distance = (completedRoutes[i % max].route.distance / 1000).toFixed(1);
			highlighted.totalPower = (completedRoutes[i % max].totalPower / 1000).toFixed(1);
			highlighted.optimizedCost = completedRoutes[i % max].optimizedCost;
			highlighted.optimizedCostDuration = completedRoutes[i % max].optimizedCostDuration;
			highlighted.optimizedDurationFinancialCost =
				completedRoutes[i % max].optimizedDurationFinancialCost;
			highlighted.optimizedDuration = completedRoutes[i % max].optimizedDuration;

			hovered[completedRoutes[(i - 1) % max]?.id] = false;
			hovered[completedRoutes[i % max].id] = true;
			i++;
		}, 500);

		return () => {
			clearInterval(interval);
		};
	});

	async function filterRoutes(type: typeof successType): Promise<void> {
		routes = [];
		await tick();
		switch (type) {
			case 'both': {
				routes = data.routes;
				break;
			}
			case 'completed': {
				routes = data.routes.filter((r) => r.optimizedDuration);
				break;
			}
			case 'overflow': {
				routes = data.routes.filter((r) => !r.optimizedDuration);
				break;
			}
		}
	}
</script>

<main class="relative">
	<div id="map" style="height: 100vh; position: relative;" class="z-0">
		{#if browser}
			<LeafletMap bind:this={leafletMap} options={mapOptions}>
				<TileLayer url={tileUrl} options={tileLayerOptions} />

				{#each routes as run (run.id)}
					{#if showOrigins || hovered[run.id]}
						<Marker
							latLng={[run.origin.latitude, run.origin.longitude]}
							events={['mouseout', 'mouseover']}
							on:mouseout={() => {
								hovered[run.id] = false;
							}}
							on:mouseover={() => {
								hovered[run.id] = true;
							}}
						>
							<DivIcon options={{ html: originIcon }} />
						</Marker>
					{/if}
					{#if showDestinations || hovered[run.id]}
						<Marker
							latLng={[run.destination.latitude, run.destination.longitude]}
							events={['mouseout', 'mouseover']}
							on:mouseout={() => {
								hovered[run.id] = false;
							}}
							on:mouseover={() => {
								hovered[run.id] = true;
							}}
						>
							<DivIcon options={{ html: destinationIcon }} />
						</Marker>
					{/if}
					{#if showRoutes || hovered[run.id]}
						<div>
							<Polyline
								latLngs={run.route.geometry.coordinates}
								color="#999"
								opacity="1"
								weight="1"
							/>
							<!-- green for completed and red for heap overflows with hover
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
							/> -->
						</div>
					{/if}
				{/each}
				{#if highlighted?.lineGeometry}
					<div>
						<Polyline latLngs={highlighted.lineGeometry} color="#3366ff" opacity="1" weight="4" />
					</div>
				{/if}
			</LeafletMap>
		{/if}
	</div>

	<div
		class="absolute bottom-[12%] right-[12%] w-[21rem] rounded-lg border border-gray-800 bg-white p-4 opacity-70"
	>
		<table class="w-full">
			<tr>
				<th scope="row">Distance </th>
				<td class="ml-4 text-right">{highlighted.distance}</td>
				<td class="w-10 pl-1 text-left font-light">km</td>
			</tr>
			<tr>
				<th scope="row">Base Route Power</th>
				<td class="ml-4 text-right">{highlighted.totalPower}</td>
				<td class="w-10 pl-1 text-left font-light">kWh</td>
			</tr>
			<tr>
				<th scope="row">Optimized Cost</th>
				<td class="ml-4 text-right">{highlighted.optimizedCost?.toFixed(2)}</td>
				<td class="w-10 pl-1 text-left font-light">SEK</td>
			</tr>
			<tr>
				<th scope="row">Fastest Route Cost</th>
				<td class="ml-4 text-right">{highlighted.optimizedDurationFinancialCost?.toFixed(2)}</td>
				<td class="w-10 pl-1 text-left font-light">SEK</td>
			</tr>
			<tr>
				<th scope="row">Savings (%)</th>
				<td class="ml-4 text-right"
					>{highlighted.optimizedDurationFinancialCost
						? (
								(100 * (highlighted.optimizedDurationFinancialCost - highlighted.optimizedCost)) /
								highlighted.optimizedDurationFinancialCost
						  ).toFixed(1)
						: 0}</td
				>
				<td class="w-10 pl-1 text-left font-light">%</td>
			</tr>
			<tr>
				<th scope="row">Savings (per hour)</th>
				<td class="ml-4 text-right"
					>{highlighted.optimizedDurationFinancialCost !== undefined &&
					highlighted.optimizedCost !== undefined &&
					highlighted.optimizedCostDuration !== undefined &&
					highlighted.optimizedDuration !== undefined &&
					highlighted.optimizedDurationFinancialCost - highlighted.optimizedCost > 0
						? (
								(3600 * (highlighted.optimizedDurationFinancialCost - highlighted.optimizedCost)) /
								(highlighted.optimizedCostDuration - highlighted.optimizedDuration)
						  ).toFixed(1)
						: 0}</td
				>
				<td class="w-10 pl-1 text-left font-light">SEK/hour</td>
			</tr>
		</table>
		<!-- optimizedCostDuration = {highlighted.optimizedCostDuration?.toFixed(2)} -->
		<!-- optimizedDuration = {highlighted.optimizedDuration?.toFixed(2)} -->
	</div>
</main>

<style>
	main :global(.leaflet-div-icon) {
		@apply border-transparent bg-transparent;
	}
	main :global(img.leaflet-marker-icon),
	main :global(.leaflet-shadow-pane img) {
		display: none;
	}

	th {
		text-align: left;
		font-weight: inherit;
	}
	tr {
		font-variant-numeric: tabular-nums;
	}
</style>
