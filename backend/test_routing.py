"""Routing safety and coordinate-order regression tests."""

import asyncio

import httpx

from assignment_engine import estimate_transit_time_minutes, haversine_distance_km
from models import AssignmentItem, RoutePoint, RouteSource, ScoreBreakdown
from routing import (
    RoadRouteResult,
    apply_road_route_result,
    geojson_to_route_points,
    get_osrm_road_route,
)


ORIGIN = RoutePoint(latitude=9.9816, longitude=76.2999)
DESTINATION = RoutePoint(latitude=9.9880, longitude=76.2882)
ROAD_GEOMETRY = {
    "type": "LineString",
    "coordinates": [
        [76.29991, 9.98161],
        [76.2950, 9.9830],
        [76.2910, 9.9860],
        [76.28821, 9.98801],
    ],
}


def make_assignment() -> AssignmentItem:
    return AssignmentItem(
        patient_id="PAT-001",
        hospital_id="H001",
        score=0.8,
        breakdown=ScoreBreakdown(
            specialist=1, capacity=1, distance=1, load_balance=1,
            resources=1, icu=1, saturation_penalty=0, access_conditions=1,
        ),
        transit_distance_km=4.2,
        estimated_transit_minutes=9.0,
    )


def test_geojson_longitude_latitude_converts_to_leaflet_latitude_longitude():
    points = geojson_to_route_points([[76.2999, 9.9816], [76.2882, 9.9880]])
    assert points is not None
    # MapView's Leaflet conversion is [point.latitude, point.longitude].
    leaflet_coordinates = [(point.latitude, point.longitude) for point in points]
    assert leaflet_coordinates == [(9.9816, 76.2999), (9.988, 76.2882)]


def test_valid_osrm_driving_geometry_is_parsed_and_keeps_osrm_metrics():
    payload = {
        "code": "Ok",
        "routes": [{"distance": 5300.5, "duration": 720.0, "geometry": ROAD_GEOMETRY}],
        "waypoints": [
            {"distance": 5, "location": [76.29991, 9.98161]},
            {"distance": 8, "location": [76.28821, 9.98801]},
        ],
    }
    requested = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        requested["url"] = str(request.url)
        return httpx.Response(200, json=payload)

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await get_osrm_road_route(ORIGIN, DESTINATION, client)

    route = asyncio.run(run())
    assert requested["url"].endswith("/route/v1/driving/76.2999000,9.9816000;76.2882000,9.9880000?overview=full&geometries=geojson&steps=false")
    assert route.source == RouteSource.OSRM_ROAD_ROUTE
    assert route.geometry is not None and len(route.geometry) == 4
    assignment = make_assignment()
    apply_road_route_result(assignment, route)
    assert assignment.transit_distance_km == 5.3
    assert assignment.estimated_transit_minutes == 12.0
    assert assignment.route_geometry == route.geometry


def test_osrm_no_route_never_creates_a_straight_driving_geometry():
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"code": "NoRoute", "message": "No route found"})

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await get_osrm_road_route(ORIGIN, DESTINATION, client)

    route = asyncio.run(run())
    assignment = make_assignment()
    apply_road_route_result(assignment, route)
    assert assignment.route_source == RouteSource.ROUTE_UNAVAILABLE
    assert assignment.route_geometry is None


def test_osrm_transport_failure_uses_approximate_source_without_geometry():
    async def handler(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("routing service unavailable")

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await get_osrm_road_route(ORIGIN, DESTINATION, client)

    route = asyncio.run(run())
    assert route.source == RouteSource.APPROXIMATE_NO_ROAD_GEOMETRY
    assert route.geometry is None


def test_haversine_fallback_keeps_approximate_distance_and_eta_without_geometry():
    distance_km = haversine_distance_km(ORIGIN.latitude, ORIGIN.longitude, DESTINATION.latitude, DESTINATION.longitude)
    eta_minutes = estimate_transit_time_minutes(distance_km)
    assignment = make_assignment()
    assignment.transit_distance_km = distance_km
    assignment.estimated_transit_minutes = eta_minutes
    route = RoadRouteResult(
        source=RouteSource.APPROXIMATE_NO_ROAD_GEOMETRY,
        error="OSRM unavailable: ConnectError",
    )
    apply_road_route_result(assignment, route)
    assert assignment.transit_distance_km == distance_km
    assert assignment.estimated_transit_minutes == eta_minutes
    assert assignment.route_source == RouteSource.APPROXIMATE_NO_ROAD_GEOMETRY
    assert assignment.route_geometry is None


def test_invalid_or_off_network_hospital_coordinates_are_flagged_unavailable():
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _request: httpx.Response(200, json={"code": "Ok"}))) as client:
            invalid = await get_osrm_road_route(ORIGIN, RoutePoint(latitude=48.8, longitude=2.3), client)
            off_network_payload = {
                "code": "Ok",
                "routes": [{"distance": 1200, "duration": 180, "geometry": ROAD_GEOMETRY}],
                "waypoints": [
                    {"distance": 5, "location": [76.29991, 9.98161]},
                    {"distance": 5000, "location": [76.28821, 9.98801]},
                ],
            }
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _request: httpx.Response(200, json=off_network_payload))) as client:
            off_network = await get_osrm_road_route(ORIGIN, DESTINATION, client)
            return invalid, off_network

    invalid, off_network = asyncio.run(run())
    assert invalid.source == RouteSource.ROUTE_UNAVAILABLE
    assert off_network.source == RouteSource.ROUTE_UNAVAILABLE
    assert off_network.geometry is None


def test_replanning_replaces_previous_geometry_and_updates_source_metrics():
    assignment = make_assignment()
    assignment.route_source = RouteSource.OSRM_ROAD_ROUTE
    assignment.route_geometry = [RoutePoint(latitude=9.97, longitude=76.29), RoutePoint(latitude=9.98, longitude=76.30)]
    new_geometry = [RoutePoint(latitude=9.9816, longitude=76.2999), RoutePoint(latitude=9.986, longitude=76.295), RoutePoint(latitude=9.988, longitude=76.2882)]
    apply_road_route_result(
        assignment,
        RoadRouteResult(RouteSource.OSRM_ROAD_ROUTE, new_geometry, 6100, 840),
        replanned=True,
    )
    assert assignment.route_geometry == new_geometry
    assert assignment.route_source == RouteSource.OSRM_ROAD_ROUTE
    assert assignment.transit_distance_km == 6.1
    assert assignment.estimated_transit_minutes == 14.0
    assert assignment.route_replanned is True
