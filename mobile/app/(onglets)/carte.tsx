/**
 * Le plan du quartier.
 *
 * Pas une carte : un plan. Il n'y a ni rues ni bâtiments — le joueur au
 * centre, les commerces posés à leur vraie direction et à leur vraie
 * distance, et les quartiers déjà levés en couleur.
 *
 * C'est un choix assumé : une vraie carte demande une bibliothèque native,
 * une version d'essai à fabriquer à chaque fois, et une clé Google sur
 * Android. Ce plan-là ne demande rien, et répond déjà aux deux questions
 * qu'on se pose devant une carte : qu'est-ce qu'il y a autour de moi, et où
 * suis-je allé ?
 *
 * La carte est VOILÉE (section 2.9) : un lieu dont le quartier n'a pas été
 * levé n'a ni nom ni missions. On le montre quand même, en gris — savoir
 * qu'il y a quelque chose là-bas est exactement ce qui donne envie d'y
 * aller.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler } from '../../src/api/client';
import { useSession } from '../../src/api/session';
import { demanderPosition, EtatPosition } from '../../src/api/position';
import { distanceEnMetres, distanceLisible } from '../../src/carte/distances';
import {
  echelleMinimale,
  echellePourTout,
  lieuxDuQuartier,
  quartierDepuisLaCle,
  quartierSurLePlan,
  versLePlan,
} from '../../src/carte/projection';
import { Aide, Badge, Bouton, Carte, Erreur, SousTitre, Titre } from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface MissionDuLieu {
  id: string;
  titre: string;
  modeInteraction: string;
  recompenseBase: number;
  statutJoueur: 'disponible' | 'en_attente' | 'accomplie';
}

interface LieuDuPlan {
  id: string;
  zone: string;
  decouvert: boolean;
  latitude: number;
  longitude: number;
  nom?: string;
  adresse?: string;
  typeEtablissement?: string;
  nombreCheckins?: number;
  multiplicateur?: number;
  missions: MissionDuLieu[];
}

interface Plan {
  zones: { visibles: string[] | null; tailleDegres: number };
  lieux: LieuDuPlan[];
}

/** Le plan est carré, et tient dans la colonne. */
const COTE = 320;
const RAYON = COTE / 2;

/**
 * Combien de commerces le plan montre.
 *
 * Les plus proches, et pas plus : c'est ce qui garde l'échelle à hauteur de
 * quartier. Tout afficher dézoomerait jusqu'à rendre le voile invisible —
 * et le voile est l'intérêt de la carte.
 */
const COMMERCES_MONTRES = 10;

export default function CartePlan() {
  const { utilisateur } = useSession();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [position, setPosition] = useState<EtatPosition>({ etat: 'attente' });
  const [choisi, setChoisi] = useState<LieuDuPlan | null>(null);
  const [erreur, setErreur] = useState('');

  const localiser = useCallback(async () => {
    setPosition({ etat: 'attente' });
    setPosition(await demanderPosition());
  }, []);

  const charger = useCallback(
    async (etat: EtatPosition) => {
      if (!utilisateur) return;
      setErreur('');
      // La position part avec la requête : c'est elle qui lève le voile sur
      // les quartiers qui entourent le joueur à cet instant.
      const parametres =
        etat.etat === 'connue'
          ? `?latitude=${etat.latitude}&longitude=${etat.longitude}`
          : '';
      try {
        setPlan(await appeler<Plan>(`/map${parametres}`));
      } catch (e) {
        setErreur((e as Error).message);
      }
    },
    [utilisateur?.id],
  );

  useEffect(() => {
    localiser();
  }, [localiser]);

  useEffect(() => {
    if (position.etat !== 'attente') charger(position);
  }, [position, charger]);

  // Le centre du plan : le joueur s'il est localisé, sinon le barycentre des
  // lieux — sans quoi on n'aurait aucun point de référence, et le plan serait
  // vide plutôt que simplement imprécis.
  const lieux = plan?.lieux ?? [];
  const centre =
    position.etat === 'connue'
      ? { latitude: position.latitude, longitude: position.longitude }
      : lieux.length > 0
        ? {
            latitude: lieux.reduce((s, l) => s + l.latitude, 0) / lieux.length,
            longitude: lieux.reduce((s, l) => s + l.longitude, 0) / lieux.length,
          }
        : null;

  const tailleZone = plan?.zones.tailleDegres ?? 0.005;
  const autour = centre ? lieuxDuQuartier(centre, lieux, COMMERCES_MONTRES) : [];
  const echelle = centre
    ? echellePourTout(centre, autour, RAYON, echelleMinimale(centre, tailleZone, COTE))
    : 1;
  const quartiers = (plan?.zones.visibles ?? [])
    .map((cle) => quartierDepuisLaCle(cle, plan?.zones.tailleDegres ?? 0.005))
    .filter((q): q is NonNullable<typeof q> => q !== null);

  const leves = plan?.zones.visibles?.length ?? 0;
  const decouverts = lieux.filter((l) => l.decouvert).length;

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Titre>Le quartier</Titre>
        <Aide>
          {leves > 0
            ? `${leves} quartier${leves > 1 ? 's' : ''} levé${leves > 1 ? 's' : ''} · ${decouverts} commerce${decouverts > 1 ? 's' : ''} découvert${decouverts > 1 ? 's' : ''} sur ${lieux.length}. Le plan montre les ${Math.min(autour.length, lieux.length)} plus proches.`
            : 'Rien de levé pour l’instant. Fais scanner ton code chez un partenaire : tout son quartier se dévoile d’un coup.'}
        </Aide>

        <Erreur>{erreur}</Erreur>

        {centre ? (
          <Carte style={styles.cartePlan}>
            <View style={styles.plan}>
              {/* Les quartiers levés, d'abord : ils sont le fond. */}
              {quartiers.map((quartier) => {
                const rect = quartierSurLePlan(quartier, centre, tailleZone, echelle);
                return (
                  <View
                    key={rect.cle}
                    style={[
                      styles.quartier,
                      {
                        left: RAYON + rect.x,
                        top: RAYON + rect.y,
                        width: rect.largeur,
                        height: rect.hauteur,
                      },
                    ]}
                  />
                );
              })}

              {/* Puis les commerces les plus proches. */}
              {autour.map((lieu) => {
                const p = versLePlan(centre, lieu, echelle);
                const actif = choisi?.id === lieu.id;
                return (
                  <Pressable
                    key={lieu.id}
                    onPress={() => setChoisi(lieu)}
                    style={[
                      styles.lieu,
                      lieu.decouvert ? styles.lieuConnu : styles.lieuVoile,
                      actif && styles.lieuChoisi,
                      { left: RAYON + p.x - 9, top: RAYON + p.y - 9 },
                    ]}
                  />
                );
              })}

              {/* Le joueur en dernier : il passe par-dessus tout le reste. */}
              {position.etat === 'connue' && (
                <View style={[styles.moi, { left: RAYON - 7, top: RAYON - 7 }]} />
              )}
            </View>

            <View style={styles.legende}>
              <Legende couleur={couleurs.accent} texte="Toi" />
              <Legende couleur={couleurs.positif} texte="Commerce connu" />
              <Legende couleur={couleurs.encreFaible} texte="Encore voilé" />
            </View>

            {position.etat !== 'connue' && (
              <>
                <Aide>
                  Sans ta position, le plan est centré sur les commerces plutôt que sur toi.
                </Aide>
                <Bouton titre="Me localiser" variante="discret" onPress={localiser} />
              </>
            )}
          </Carte>
        ) : (
          <Carte>
            <Aide>Aucun commerce partenaire à afficher pour l'instant.</Aide>
          </Carte>
        )}

        {choisi && (
          <FicheLieu
            lieu={choisi}
            centre={centre}
            onFermer={() => setChoisi(null)}
          />
        )}

        {!choisi && lieux.length > 0 && (
          <Aide>Touche un point du plan pour savoir ce qu'il y a là-bas.</Aide>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Legende({ couleur, texte }: { couleur: string; texte: string }) {
  return (
    <View style={styles.legendeLigne}>
      <View style={[styles.legendePastille, { backgroundColor: couleur }]} />
      <Text style={styles.legendeTexte}>{texte}</Text>
    </View>
  );
}

function FicheLieu({
  lieu,
  centre,
  onFermer,
}: {
  lieu: LieuDuPlan;
  centre: { latitude: number; longitude: number } | null;
  onFermer: () => void;
}) {
  const metres = centre
    ? distanceEnMetres(centre.latitude, centre.longitude, lieu.latitude, lieu.longitude)
    : null;

  if (!lieu.decouvert) {
    return (
      <Carte style={styles.fiche}>
        <View style={styles.enteteFiche}>
          <SousTitre>Un lieu encore voilé</SousTitre>
          <Pressable onPress={onFermer}>
            <Text style={styles.fermer}>Fermer</Text>
          </Pressable>
        </View>
        <Aide>
          Un partenaire se cache ici{metres !== null ? `, à ${distanceLisible(metres)}` : ''}. Va
          sur place et fais scanner ton code : tout son quartier se lèvera d'un coup.
        </Aide>
        <Bouton titre="Montrer mon code" onPress={() => router.push('/code')} />
      </Carte>
    );
  }

  return (
    <Carte style={styles.fiche}>
      <View style={styles.enteteFiche}>
        <SousTitre>{lieu.nom}</SousTitre>
        <Pressable onPress={onFermer}>
          <Text style={styles.fermer}>Fermer</Text>
        </Pressable>
      </View>

      <Text style={styles.adresse}>{lieu.adresse}</Text>

      <View style={styles.badges}>
        {Boolean(lieu.typeEtablissement) && <Badge texte={lieu.typeEtablissement as string} />}
        {metres !== null && <Badge texte={distanceLisible(metres)} />}
        {(lieu.multiplicateur ?? 1) > 1 && (
          <Badge
            texte={`+${Math.round(((lieu.multiplicateur as number) - 1) * 100)} % ici`}
            ton="positif"
          />
        )}
      </View>

      {lieu.missions.length === 0 ? (
        <Aide>Aucune mission proposée ici pour l'instant.</Aide>
      ) : (
        lieu.missions.map((mission) => (
          <View key={mission.id} style={styles.mission}>
            <Text style={styles.missionTitre}>{mission.titre}</Text>
            <Text style={styles.missionMeta}>
              {mission.statutJoueur === 'accomplie'
                ? '✓ accomplie'
                : mission.statutJoueur === 'en_attente'
                  ? '⏳ en attente'
                  : `+${mission.recompenseBase}`}
            </Text>
          </View>
        ))
      )}
    </Carte>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  cartePlan: { gap: espaces.md, alignItems: 'center' },
  plan: {
    width: COTE,
    height: COTE,
    maxWidth: '100%',
    borderRadius: rayons.md,
    backgroundColor: couleurs.nuit,
    borderWidth: 1,
    borderColor: couleurs.trait,
    overflow: 'hidden',
  },

  quartier: {
    position: 'absolute',
    backgroundColor: 'rgba(124, 92, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.22)',
  },

  lieu: { position: 'absolute', width: 18, height: 18, borderRadius: rayons.plein, borderWidth: 2 },
  lieuConnu: { backgroundColor: couleurs.positifDoux, borderColor: couleurs.positif },
  lieuVoile: { backgroundColor: 'transparent', borderColor: couleurs.encreFaible },
  lieuChoisi: { borderColor: couleurs.encre, borderWidth: 3 },

  moi: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: rayons.plein,
    backgroundColor: couleurs.accent,
    borderWidth: 2,
    borderColor: couleurs.encre,
  },

  legende: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.lg, alignSelf: 'flex-start' },
  legendeLigne: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendePastille: { width: 10, height: 10, borderRadius: rayons.plein },
  legendeTexte: { ...typo.petit, color: couleurs.encreFaible },

  fiche: { gap: espaces.sm },
  enteteFiche: { flexDirection: 'row', alignItems: 'center', gap: espaces.md },
  fermer: { ...typo.petit, fontWeight: '600', color: couleurs.accentEncre, marginLeft: 'auto' },
  adresse: { ...typo.petit, color: couleurs.encreDouce },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.sm },

  mission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.md,
    paddingVertical: espaces.sm,
    borderTopWidth: 1,
    borderTopColor: couleurs.trait,
  },
  missionTitre: { flex: 1, ...typo.petit, color: couleurs.encre },
  missionMeta: { ...typo.petit, fontWeight: '600', color: couleurs.accentEncre },
});
