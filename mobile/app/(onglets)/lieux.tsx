/**
 * Les lieux autour de soi.
 *
 * L'écran le plus « téléphone » de l'application : il se sert du GPS pour
 * trier les commerces par distance et pour valider qu'on y est vraiment.
 *
 * Trois états à tenir, et aucun ne doit laisser un écran vide :
 *  - la position est connue → la liste est triée, le check-in est possible ;
 *  - elle est refusée → la liste s'affiche quand même, et on explique
 *    pourquoi le check-in ne l'est pas ;
 *  - elle n'arrive pas (intérieur, GPS qui démarre) → pareil, avec un bouton
 *    pour réessayer.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler, urlPhoto } from '../../src/api/client';
import { useSession } from '../../src/api/session';
import {
  demanderPosition,
  distanceEnMetres,
  distanceLisible,
  EtatPosition,
} from '../../src/api/position';
import {
  Aide,
  Badge,
  Bouton,
  Carte,
  Erreur,
  initialesDe,
  SousTitre,
  teinteDe,
  Titre,
} from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface Lieu {
  id: string;
  nom: string;
  adresse: string;
  typeEtablissement: string;
  latitude: number;
  longitude: number;
  noteMoyenne: number | null;
  nombreAvis: number;
  nombreMissions: number;
  multiplicateur: number;
  photoVersion: number | null;
}

interface Retour {
  texte: string;
  bon: boolean;
}

/**
 * Le rayon de validation côté serveur, recopié ici pour l'AFFICHAGE
 * seulement. Il est réglable depuis le back-office : si quelqu'un le change,
 * le bouton restera discret un peu trop tôt ou un peu trop tard, mais le
 * serveur, lui, appliquera toujours la bonne valeur.
 */
const RAYON_INDICATIF_METRES = 150;

function tropLoin(metres: number | null): boolean {
  return metres !== null && metres > RAYON_INDICATIF_METRES;
}

export default function Lieux() {
  const { utilisateur } = useSession();
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [position, setPosition] = useState<EtatPosition>({ etat: 'attente' });
  const [retours, setRetours] = useState<Record<string, Retour>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [rechargement, setRechargement] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setErreur('');
    try {
      setLieux(await appeler<Lieu[]>('/businesses'));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, []);

  const localiser = useCallback(async () => {
    setPosition({ etat: 'attente' });
    setPosition(await demanderPosition());
  }, []);

  useEffect(() => {
    charger();
    localiser();
  }, [charger, localiser]);

  async function validerMaVenue(lieu: Lieu) {
    if (position.etat !== 'connue' || !utilisateur) return;

    setEnCours(lieu.id);
    try {
      const resultat = await appeler<{ zoneDecouverte: { xpGagnee: number } | null }>(
        `/businesses/${lieu.id}/checkins`,
        {
          methode: 'POST',
          corps: {
            playerId: utilisateur.id,
            latitude: position.latitude,
            longitude: position.longitude,
          },
        },
      );

      const quartier = resultat.zoneDecouverte
        ? ` Nouveau quartier dévoilé : +${resultat.zoneDecouverte.xpGagnee} XP.`
        : '';
      setRetours((r) => ({
        ...r,
        [lieu.id]: { texte: `Ta venue est validée.${quartier}`, bon: true },
      }));
    } catch (e) {
      setRetours((r) => ({ ...r, [lieu.id]: { texte: (e as Error).message, bon: false } }));
    } finally {
      setEnCours(null);
    }
  }

  // Trier par distance n'a de sens que si on sait où l'on est. Sinon on garde
  // l'ordre du serveur plutôt que d'inventer un classement.
  const avecDistance = lieux.map((lieu) => ({
    lieu,
    metres:
      position.etat === 'connue'
        ? distanceEnMetres(position.latitude, position.longitude, lieu.latitude, lieu.longitude)
        : null,
  }));
  if (position.etat === 'connue') {
    avecDistance.sort((a, b) => (a.metres ?? 0) - (b.metres ?? 0));
  }

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={
          <RefreshControl
            refreshing={rechargement}
            onRefresh={async () => {
              setRechargement(true);
              await Promise.all([charger(), localiser()]);
              setRechargement(false);
            }}
            tintColor={couleurs.accent}
          />
        }
      >
        <Titre>Autour de toi</Titre>
        <EtatDeLaPosition position={position} onReessayer={localiser} />
        <Erreur>{erreur}</Erreur>

        {avecDistance.map(({ lieu, metres }) => (
          <Carte key={lieu.id}>
            <View style={styles.enteteLieu}>
              <Pastille lieu={lieu} />
              <View style={styles.identiteLieu}>
                <SousTitre>{lieu.nom}</SousTitre>
                <Text style={styles.adresse}>{lieu.adresse}</Text>
              </View>
              {metres !== null && (
                <Text style={styles.distance}>{distanceLisible(metres)}</Text>
              )}
            </View>

            <View style={styles.badges}>
              <Badge texte={lieu.typeEtablissement} />
              <Badge
                texte={
                  lieu.nombreAvis > 0
                    ? `★ ${lieu.noteMoyenne}/5 · ${lieu.nombreAvis} avis`
                    : 'Pas encore d’avis'
                }
              />
              {lieu.multiplicateur > 1 && (
                <Badge
                  texte={`+${Math.round((lieu.multiplicateur - 1) * 100)} % ici`}
                  ton="positif"
                />
              )}
            </View>

            <Bouton
              titre={
                tropLoin(metres) ? `Trop loin (${distanceLisible(metres!)})` : 'Je suis sur place'
              }
              onPress={() => validerMaVenue(lieu)}
              charge={enCours === lieu.id}
              // Discret quand on est visiblement trop loin : le bouton invite
              // moins, sans jamais interdire. Car c'est le SERVEUR qui
              // tranche, avec sa propre mesure — griser d'après un calcul
              // fait sur le téléphone empêcherait de valider une venue
              // parfaitement légitime quand le GPS est simplement imprécis.
              variante={tropLoin(metres) ? 'discret' : 'principal'}
              desactive={position.etat !== 'connue'}
            />

            {retours[lieu.id] && (
              <Text
                style={[
                  styles.retour,
                  { color: retours[lieu.id].bon ? couleurs.positif : couleurs.negatif },
                ]}
              >
                {retours[lieu.id].texte}
              </Text>
            )}
          </Carte>
        ))}

        {lieux.length === 0 && !erreur && (
          <Carte>
            <Aide>Aucun commerce partenaire pour l'instant.</Aide>
          </Carte>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Pastille({ lieu }: { lieu: Lieu }) {
  const teinte = teinteDe(lieu.nom);
  const photo = urlPhoto('commerce', lieu.id, lieu.photoVersion);

  return (
    <View style={[styles.pastille, { backgroundColor: teinte.fond }]}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.pastilleImage} />
      ) : (
        <Text style={[styles.pastilleInitiales, { color: teinte.encre }]}>
          {initialesDe(lieu.nom)}
        </Text>
      )}
    </View>
  );
}

function EtatDeLaPosition({
  position,
  onReessayer,
}: {
  position: EtatPosition;
  onReessayer: () => void;
}) {
  if (position.etat === 'attente') {
    return (
      <View style={styles.bandeau}>
        <ActivityIndicator color={couleurs.accent} size="small" />
        <Text style={styles.bandeauTexte}>Recherche de ta position…</Text>
      </View>
    );
  }

  if (position.etat === 'connue') {
    return (
      <Aide>
        Les commerces sont classés du plus proche au plus loin
        {position.precisionMetres
          ? ` · position connue à ${Math.round(position.precisionMetres)} m près`
          : ''}
        .
      </Aide>
    );
  }

  return (
    <Carte style={styles.carteAlerte}>
      <SousTitre>
        {position.etat === 'refusee' ? 'Position refusée' : 'Position introuvable'}
      </SousTitre>
      <Aide>
        {position.etat === 'refusee'
          ? "Sans ta position, l'application ne peut pas classer les commerces par distance ni valider que tu es sur place. Tu peux l'autoriser dans les réglages de ton téléphone."
          : "Ton téléphone n'arrive pas à se situer. C'est fréquent en intérieur : approche-toi d'une fenêtre et réessaie."}
      </Aide>
      <Bouton titre="Réessayer" variante="discret" onPress={onReessayer} />
    </Carte>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  bandeau: { flexDirection: 'row', alignItems: 'center', gap: espaces.sm },
  bandeauTexte: { ...typo.petit, color: couleurs.encreDouce },
  carteAlerte: { borderColor: couleurs.traitFort },

  enteteLieu: { flexDirection: 'row', alignItems: 'center', gap: espaces.md },
  identiteLieu: { flex: 1, gap: 2 },
  adresse: { ...typo.petit, color: couleurs.encreDouce },
  distance: { ...typo.petit, color: couleurs.accentEncre, fontWeight: '600' },

  pastille: {
    width: 46,
    height: 46,
    borderRadius: rayons.plein,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pastilleImage: { width: '100%', height: '100%' },
  pastilleInitiales: { fontSize: 15, fontWeight: '700' },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.sm },
  retour: { ...typo.petit, lineHeight: 19 },
});
