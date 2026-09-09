// Forme des entrées de docs/missions-catalogue.json (section "missions").
export interface CatalogueMission {
  id: string;
  titre: string;
  description: string;
  archetype_dominant: string;
  duree: string;
  theme: string;
  mode_interaction: string;
  recompense_base: number;
  phase_relationnelle?: string;
  type_special?: string;
  parcours_id?: string;
  etape?: number;
  debloque_mission_id?: string | null;
}

export interface MissionsCatalogue {
  missions: CatalogueMission[];
}
