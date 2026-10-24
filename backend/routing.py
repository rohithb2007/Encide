"""Road-route lookup and coordinate validation for operational assignments.

Coordinates are represented as named latitude/longitude values in MED-NET.
OSRM uses longitude,latitude in request paths and GeoJSON; conversion happens
only in the helpers below.
"""

import math
import os
from dataclasses import dataclass
from typing import Any

import httpx

from models import AssignmentItem, RoutePoint, RouteSource


OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org").rstrip("/")
OSRM_TIMEOUT_SECONDS = float(os.getenv("OSRM_TIMEOUT_SECONDS", "2.5"))
MAX_ROAD_SNAP_DISTANCE_METERS = 120.0


@dataclass(frozen=True)
class RoadRouteResult:
    source: RouteSource
    geometry: list[RoutePoint] | None = None
    distance_meters: float | None = None
    duration_seconds: float | None = None
    error: str | None = None


def apply_road_route_result(
    assignment: AssignmentItem,
    route: RoadRouteResult,
    *,
    replanned: bool = False,
) -> None:
    """Replace route metadata atomically; absent geometry never gets synthesized."""
    assignment.route_source = route.source
    assignment.route_geometry = route.geometry
    assignment.route_error = route.error
    assignment.route_replanned = replanned
    if route.source == RouteSource.OSRM_ROAD_ROUTE:
        assignment.transit_distance_km = round((route.distance_meters or 0) / 1000, 2)
        assignment.estimated_transit_minutes = round((route.duration_seconds or 0) / 60, 1)


def is_valid_ernakulam_coordinate(point: RoutePoint) -> bool:
    """Reject invalid WGS84 values and points outside the Ernakulam region."""
    return (
        math.isfinite(point.latitude)
        and math.isfinite(point.longitude)
        and 9.70 <= point.latitude <= 10.30
        and 75.95 <= point.longitude <= 76.65
    )


def to_osrm_coordinate(point: RoutePoint) -> str:
    """Serialize one MED-NET latitude/longitude point as OSRM longitude,latitude."""
    return f"{point.longitude:.7f},{point.latitude:.7f}"


def geojson_to_route_points(coordinates: Any) -> list[RoutePoint] | None:
    """Convert GeoJSON [longitude, latitude] pairs to named MED-NET points."""
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        return None

    points: list[RoutePoint] = []
    for longitude_latitude in coordinates:
        if not isinstance(longitude_latitude, (list, tuple)) or len(longitude_latitude) < 2:
            return None
        longitude, latitude = longitude_latitude[0], longitude_latitude[1]
        if (
            isinstance(latitude, bool)
            or isinstance(longitude, bool)
            or not isinstance(latitude, (float, int))
            or not isinstance(longitude, (float, int))
        ):
            return None
        point = RoutePoint(latitude=float(latitude), longitude=float(longitude))
        if not (-90 <= point.latitude <= 90 and -180 <= point.longitude <= 180):
            return None
        points.append(point)
    return points


def _finite_positive(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0


def _finite_nonnegative(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0


def _distance_meters(left: RoutePoint, right: RoutePoint) -> float:
    earth_radius_m = 6_371_000.0
    lat1, lat2 = math.radians(left.latitude), math.radians(right.latitude)
    lat_delta = lat2 - lat1
    lon_delta = math.radians(right.longitude - left.longitude)
    haversine = (
        math.sin(lat_delta / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(lon_delta / 2) ** 2
    )
    return earth_radius_m * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def _parse_success_response(payload: Any, origin: RoutePoint, destination: RoutePoint) -> RoadRouteResult:
    if not isinstance(payload, dict):
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="Malformed OSRM response")
    if payload.get("code") != "Ok":
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error=f"OSRM {payload.get('code') or 'error'}")

    routes = payload.get("routes")
    waypoints = payload.get("waypoints")
    if not isinstance(routes, list) or not routes or not isinstance(waypoints, list) or len(waypoints) != 2:
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="OSRM response omitted route or snapped endpoints")

    route = routes[0]
    if not isinstance(route, dict) or not _finite_positive(route.get("distance")) or not _finite_positive(route.get("duration")):
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="OSRM returned invalid distance or duration")

    geometry_data = route.get("geometry")
    if not isinstance(geometry_data, dict) or geometry_data.get("type") != "LineString":
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="OSRM returned invalid GeoJSON geometry")
    geometry = geojson_to_route_points(geometry_data.get("coordinates"))
    if not geometry:
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="OSRM returned malformed route coordinates")

    snapped_points: list[RoutePoint] = []
    for waypoint in waypoints:
        if not isinstance(waypoint, dict) or not _finite_nonnegative(waypoint.get("distance")):
            return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="OSRM returned an invalid snapped endpoint")
        location = waypoint.get("location")
        snapped = geojson_to_route_points([location, location]) if isinstance(location, (list, tuple)) else None
        if not snapped:
            return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="OSRM returned malformed snapped coordinates")
        snapped_points.append(snapped[0])

    if any(float(waypoint["distance"]) > MAX_ROAD_SNAP_DISTANCE_METERS for waypoint in waypoints):
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="Endpoint is more than 120 m from the road network")
    if _distance_meters(geometry[0], snapped_points[0]) > 100 or _distance_meters(geometry[-1], snapped_points[-1]) > 100:
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="Route geometry does not match its snapped endpoints")
    if _distance_meters(origin, geometry[0]) > MAX_ROAD_SNAP_DISTANCE_METERS or _distance_meters(destination, geometry[-1]) > MAX_ROAD_SNAP_DISTANCE_METERS:
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="Route endpoints are more than 120 m from the requested locations")

    return RoadRouteResult(
        source=RouteSource.OSRM_ROAD_ROUTE,
        geometry=geometry,
        distance_meters=float(route["distance"]),
        duration_seconds=float(route["duration"]),
    )


async def get_osrm_road_route(
    origin: RoutePoint,
    destination: RoutePoint,
    client: httpx.AsyncClient | None = None,
) -> RoadRouteResult:
    """Request a full OSRM driving route; never synthesize fallback geometry."""
    if not is_valid_ernakulam_coordinate(origin) or not is_valid_ernakulam_coordinate(destination):
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="Coordinates are outside the Ernakulam routing region")

    owns_client = client is None
    route_client = client or httpx.AsyncClient(timeout=OSRM_TIMEOUT_SECONDS)
    url = f"{OSRM_BASE_URL}/route/v1/driving/{to_osrm_coordinate(origin)};{to_osrm_coordinate(destination)}"
    try:
        response = await route_client.get(
            url,
            params={"overview": "full", "geometries": "geojson", "steps": "false"},
        )
        response.raise_for_status()
        return _parse_success_response(response.json(), origin, destination)
    except (httpx.TimeoutException, httpx.RequestError) as error:
        return RoadRouteResult(RouteSource.APPROXIMATE_NO_ROAD_GEOMETRY, error=f"OSRM unavailable: {type(error).__name__}")
    except (httpx.HTTPStatusError, ValueError):
        return RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE, error="OSRM returned an unusable response")
    finally:
        if owns_client:
            await route_client.aclose()
