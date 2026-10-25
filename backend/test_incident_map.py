"""Regression checks for one accident scene and its receiving hospital."""

import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from starlette.requests import Request

import main
from assignment_engine import haversine_distance_km
from data_gen import generate_surge
from models import RouteSource
from routing import RoadRouteResult


class IncidentMapTests(unittest.TestCase):
    def test_surge_keeps_casualties_at_the_reported_accident_scene(self):
        for latitude, longitude in [(9.9816, 76.2999), (9.9675, 76.2942)]:
            casualties = generate_surge(100, latitude, longitude, 'SCENE-TEST')
            self.assertEqual(len(casualties), 100)
            self.assertTrue(all(
                (p.latitude, p.longitude, p.incident_id) == (latitude, longitude, 'SCENE-TEST')
                for p in casualties
            ))

    def test_scene_route_skips_full_and_closed_hospitals(self):
        state = main.SystemState()
        incident = state.incident
        nearest_first = sorted(state.hospitals.values(), key=lambda h: haversine_distance_km(
            incident['latitude'], incident['longitude'], h.latitude, h.longitude,
        ))
        nearest_first[0].available_beds = 0
        nearest_first[1].is_accepting = False
        receiving_hospital = nearest_first[2]
        lookup = AsyncMock(return_value=RoadRouteResult(RouteSource.ROUTE_UNAVAILABLE))
        request = Request({'type': 'http', 'headers': [(b'x-demo-role', b'COORDINATOR'), (b'x-demo-actor', b'Map Check')]})

        with patch.object(main, 'state', state), patch.object(main, 'get_osrm_road_route', lookup):
            result = asyncio.run(main.get_nearby_hospitals(incident['id'], request))

        selected = [hospital for hospital in result if hospital.get('is_nearest')]
        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]['hospital']['id'], receiving_hospital.id)
        origin, destination = lookup.call_args.args
        self.assertEqual((origin.latitude, origin.longitude), (incident['latitude'], incident['longitude']))
        self.assertEqual((destination.latitude, destination.longitude), (receiving_hospital.latitude, receiving_hospital.longitude))

    def test_all_full_never_requests_a_route_to_a_full_hospital(self):
        state = main.SystemState()
        for hospital in state.hospitals.values():
            hospital.available_beds = 0
        lookup = AsyncMock()
        request = Request({'type': 'http', 'headers': [(b'x-demo-role', b'COORDINATOR'), (b'x-demo-actor', b'Map Check')]})
        with patch.object(main, 'state', state), patch.object(main, 'get_osrm_road_route', lookup):
            result = asyncio.run(main.get_nearby_hospitals(state.incident['id'], request))
        lookup.assert_not_called()
        self.assertTrue(all(not hospital.get('route_geometry') for hospital in result))


if __name__ == '__main__':
    unittest.main()
