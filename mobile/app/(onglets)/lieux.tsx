/**
 * Les lieux autour de soi.
 *
 * L'écran le plus « téléphone » de l'application : il se sert du GPS pour
 * trier les commerces du plus proche au plus loin.
 *
 * Le GPS ne sert plus qu'à ÇA. Enregistrer une venue passe maintenant par le
 * code de présence, que le commerçant scanne sur place — un GPS se laisse
 * tromper depuis le trottoir d'en face, pas un code présenté à quelqu'un
 * derrière un comptoir.
 *
 * Trois états à tenir, et aucun ne doit laisser un écran vide :
 *  - la position est connue → la liste est triée par distance ;
 *  - elle est refusée → la liste s'affiche quand même, sans les distances ;
 *  - elle n'arrive pas (intérieur, GPS qui démarre) → pareil, avec un bouton
 *    pour réessayer.
 */
import { router } from 'expo-router';
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

export default function Lieux() {
  const { utilisateur } = useSession();
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [position, setPosition] = useState<EtatPosition>({ etat: 'attente' });
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
              titre="Montrer mon code sur place"
              variante="discret"
              onPress={() => router.push('/code')}
            />
            <Aide>
              C'est le commerçant qui scanne ton code : c'est ce qui enregistre ta venue.
            </Aide>
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
          ? "Sans ta position, les commerces ne peuvent pas être classés du plus proche au plus loin. Tu peux l’autoriser dans les réglages de ton téléphone — ça ne change rien à l’enregistrement de tes venues, qui passe par ton code."
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
