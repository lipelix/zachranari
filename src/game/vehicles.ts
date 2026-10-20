import ambulanceUrl from "../art/ambulance.svg?url";
import fireUrl from "../art/fire.svg?url";
import policeUrl from "../art/police.svg?url";
import badgeUrl from "../art/badge.svg?url";
import dropUrl from "../art/drop.svg?url";
import heartUrl from "../art/heart.svg?url";
import fireStationUrl from "../art/fire-station.svg?url";
import hospitalUrl from "../art/hospital.svg?url";
import policeStationUrl from "../art/police-station.svg?url";

export type VehicleId = "ambulance" | "police" | "fire";
export type SirenKind = "hilo" | "wail" | "yelp";

/** A vehicle as drawn in its SVG (viewBox units), with what it collects and where it stops. */
export interface Vehicle {
  id: VehicleId;
  /** Czech name, said aloud and written under the card. */
  name: string;
  /** The emergency number painted on it. */
  phone: string;
  url: string;
  viewBox: { width: number; height: number };
  /** The y of the tyres' contact with the road. */
  ground: number;
  wheels: readonly { x: number; y: number; r: number }[];
  beacons: readonly { x: number; y: number }[];
  /** What it picks up along the road: hearts, badges, water drops. */
  treat: { key: string; url: string };
  /** Its station, passed at every milestone. */
  station: { key: string; url: string };
  siren: SirenKind;
  /** The card's colour in the garage. */
  color: number;
}

export const VEHICLES: readonly Vehicle[] = [
  {
    id: "ambulance",
    name: "Záchranka",
    phone: "155",
    url: ambulanceUrl,
    viewBox: { width: 420, height: 224 },
    ground: 218,
    wheels: [
      { x: 90, y: 186, r: 32 },
      { x: 330, y: 186, r: 32 },
    ],
    beacons: [
      { x: 54, y: 30 },
      { x: 264, y: 30 },
    ],
    treat: { key: "heart", url: heartUrl },
    station: { key: "hospital", url: hospitalUrl },
    siren: "hilo",
    color: 0x16a34a,
  },
  {
    id: "police",
    name: "Policie",
    phone: "158",
    url: policeUrl,
    viewBox: { width: 420, height: 224 },
    ground: 220,
    wheels: [
      { x: 95, y: 190, r: 30 },
      { x: 325, y: 190, r: 30 },
    ],
    beacons: [
      { x: 132, y: 49 },
      { x: 188, y: 49 },
    ],
    treat: { key: "badge", url: badgeUrl },
    station: { key: "police-station", url: policeStationUrl },
    siren: "wail",
    color: 0x1d4ed8,
  },
  {
    id: "fire",
    name: "Hasiči",
    phone: "150",
    url: fireUrl,
    viewBox: { width: 460, height: 224 },
    ground: 218,
    wheels: [
      { x: 95, y: 186, r: 32 },
      { x: 175, y: 186, r: 32 },
      { x: 380, y: 186, r: 32 },
    ],
    beacons: [
      { x: 350, y: 20 },
      { x: 388, y: 20 },
    ],
    treat: { key: "drop", url: dropUrl },
    station: { key: "fire-station", url: fireStationUrl },
    siren: "yelp",
    color: 0xdc2626,
  },
];

export function vehicleById(id: string): Vehicle {
  const found = VEHICLES.find((v) => v.id === id);
  if (!found) throw new Error(`Unknown vehicle: ${id}`);
  return found;
}
