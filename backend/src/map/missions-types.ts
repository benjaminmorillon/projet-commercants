// Chaque lieu partenaire propose, en plus de ses propres missions, quelques
// « missions types » piochées dans le catalogue commun. Le tirage est
// déterministe : un même lieu propose toujours les mêmes, sans qu'on ait
// besoin de stocker quoi que ce soit en base.
export const MISSIONS_TYPES_PAR_LIEU = 3;

export function graineDepuisId(id: string): number {
  let graine = 0;
  for (let i = 0; i < id.length; i += 1) {
    graine = (graine * 31 + id.charCodeAt(i)) % 100000;
  }
  return graine;
}

export function choisirMissionsTypes<T>(
  businessId: string,
  catalogue: T[],
  combien = MISSIONS_TYPES_PAR_LIEU,
): T[] {
  if (catalogue.length === 0) {
    return [];
  }
  const graine = graineDepuisId(businessId);
  const choisies: T[] = [];
  // Le pas (7919, premier) fait avancer dans le catalogue sans retomber
  // immédiatement sur la même entrée.
  for (let i = 0; choisies.length < Math.min(combien, catalogue.length); i += 1) {
    if (i > catalogue.length * 2) {
      break;
    }
    const mission = catalogue[(graine + i * 7919) % catalogue.length];
    if (!choisies.includes(mission)) {
      choisies.push(mission);
    }
  }
  return choisies;
}
