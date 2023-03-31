# Electric Vehicle Routing with Charging Stations and Pricing

This repo only has data for the road network of Sweden but can be extended with Open Street Map data from [Geofabrik](https://download.geofabrik.de/index.html) for other countries or the planet.

## How it works

1. Click the map for origin, then again for destination.
2. A request with the lat/lon of the origin and destination is sent to the server.
3. The server uses node bindings for the [OSRM](https://github.com/Project-OSRM/osrm-backend/blob/master/docs/nodejs/api.md) routing engine to find the fastest route between the origin and destination, using the multi-level Dijkstra algorithm.
4. The server sends the data about the fastest route to the client.
5. The route is added to the map, along with a short summary of the route with distance and duration.

## Todo:

6. Add initial charge state (SoC) and show stats for default car specifications.
7. Estimate each route segment's energy consumption.
   1. Start with assuming flat road and constant speed at the average according to the route data.
   2. Later, improve the estimate:
      1. Use the simulation model from [Genikomsakis, K. N., & Mitrentsis, G. (2017)](https://www.sciencedirect.com/science/article/pii/S1361920915302881). A computationally efficient simulation model for estimating energy consumption of electric vehicles in the context of route planning applications. Transportation Research Part D: Transport and Environment, 50, 98–118. https://doi.org/10.1016/j.trd.2016.10.014.
      2. Use the [Common Artemis Driving Cycles](https://dieselnet.com/standards/cycles/artemis.php) developed for European real-world driving patterns.
8. Add charging station locations with available ports and pricing.
9.  Calculate cheapest route with charging.
10. Show the route, the pricing, and the energy consumption.
11. Convert route to a gradient with current battery level as color of the route.
12. Add elevation data.
13. Hover on route to show stats.
14. Add ability to change default car specifications.
