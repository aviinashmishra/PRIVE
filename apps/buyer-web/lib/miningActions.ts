// Canonical Proof-of-Green-Action catalog, shared by the API (authoritative
// point values — clients can only send a key) and the mining page (labels/UI).

export interface MiningAction {
  key: string;
  label: string;
  sub: string;
  points: number;
}

export const MINING_ACTIONS: MiningAction[] = [
  { key: "steps", label: "Log today's steps", sub: "Health sync · GPS verified", points: 120 },
  { key: "checkin", label: "Daily check-in", sub: "Keep your streak alive", points: 50 },
  { key: "utility", label: "Upload utility bill", sub: "Reduced consumption", points: 80 },
  { key: "referral", label: "Refer a friend", sub: "Both earn credits", points: 400 },
  { key: "tree", label: "Tree-planting drive", sub: "Geotagged + NGO verified", points: 200 },
  { key: "solar", label: "Green merchant purchase", sub: "Receipt scanned", points: 90 },
];

export const POINTS_PER_CREDIT = 1000; // 1,000 pts → 1.000 PRIVE-CO2
export const CO2_KG_PER_POINT = 1 / 8; // rough demo factor for "CO2 saved"

export function findAction(key: string): MiningAction | undefined {
  return MINING_ACTIONS.find((a) => a.key === key);
}
