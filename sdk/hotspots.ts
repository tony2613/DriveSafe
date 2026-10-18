import { HotspotZone } from './types';

/**
 * Prominent Bengaluru Traffic Police (BTP) Accident Blackspots & Hotspots
 * High collision density nodes where zero-tolerance strike policies trigger.
 */
export const BTP_HOTSPOTS: HotspotZone[] = [
  {
    id: 'btp_silkboard',
    name: 'Central Silk Board Junction (Hosur Rd / Outer Ring Rd)',
    latitude: 12.9177,
    longitude: 77.6238,
    radiusMeters: 450,
    riskWeight: 5
  },
  {
    id: 'btp_tinfactory',
    name: 'Tin Factory / KR Puram Hanging Bridge Node',
    latitude: 12.9972,
    longitude: 77.6698,
    radiusMeters: 500,
    riskWeight: 5
  },
  {
    id: 'btp_hebbal',
    name: 'Hebbal Flyover Expressway Ramp',
    latitude: 13.0358,
    longitude: 77.5970,
    radiusMeters: 400,
    riskWeight: 4
  },
  {
    id: 'btp_marathahalli',
    name: 'Marathahalli Multiplex / Outer Ring Rd Junction',
    latitude: 12.9562,
    longitude: 77.7011,
    radiusMeters: 350,
    riskWeight: 4
  },
  {
    id: 'btp_ecity_toll',
    name: 'Electronic City Phase 1 Elevated Toll Exit',
    latitude: 12.8452,
    longitude: 77.6602,
    radiusMeters: 450,
    riskWeight: 4
  },
  {
    id: 'btp_goraguntepalya',
    name: 'Goraguntepalya / Tumkur Road Junction',
    latitude: 13.0289,
    longitude: 77.5407,
    radiusMeters: 400,
    riskWeight: 4
  }
];

/**
 * Calculates distance in meters between two geographical coordinates (Haversine Formula)
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluates current GPS coordinate against the BTP hotspot matrix
 */
export function findMatchingHotspot(lat: number, lon: number): HotspotZone | null {
  for (const hotspot of BTP_HOTSPOTS) {
    const dist = calculateHaversineDistanceMeters(lat, lon, hotspot.latitude, hotspot.longitude);
    if (dist <= hotspot.radiusMeters) {
      return hotspot;
    }
  }
  return null;
}
