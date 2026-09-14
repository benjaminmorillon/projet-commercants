/**
 * Mon profil : qui je suis, où j'en suis.
 *
 * Le premier écran de l'application, et celui qu'on ouvre le plus souvent :
 * il doit répondre d'un coup d'œil à « qu'est-ce que j'ai gagné » et
 * « qu'est-ce que je fais maintenant ».
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler, sourcePhoto } from '../../src/api/client';
import { useSession } from '../../src/api/session';
import {
  Aide,
  Badge,
  Bouton,
  Carte,
  initialesDe,
  SousTitre,
  teinteDe,
  Titre,
} from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface Progression {
  niveau: number;
  xpTotal: number;
  xpNiveauActuel: number;
  xpProchainNiveau: number;
  progressionVersNiveauSuivant: number;
}

interface Profil {
  scoreExplorateur: number;
  scoreAccomplisseur: number;
  scoreCompetiteur: number;
  scoreSocialisateur: number;
  questionnaireCompletedAt: string | null;
}

const ARCHETYPES: [keyof Profil, string][] = [
  ['scoreExplorateur', 'Explorateur'],
  ['scoreAccomplisseur', 'Accomplisseur'],
  ['scoreCompetiteur', 'Compétiteur'],
  ['scoreSocialisateur', 'Socialisateur'],
];

export default function MonProfil() {
  const { utilisateur, deconnecter, rafraichir } = useSession();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [solde, setSolde] = useState<number | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; headers?: Record<string, string> } | null>(null);
  const [rechargement, setRechargement] = useState(false);

  const charger = useCallback(async () => {
    if (!utilisateur) return;

    // Les trois appels partent ensemble : rien n'oblige à les enchaîner, et
    // sur un réseau mobile l'attente serait trois fois plus longue.
    const [p, pr, s] = await Promise.all([
      appeler<Profil>(`/players/${utilisateur.id}/profile`).catch(() => null),
      appeler<Progression>(`/players/${utilisateur.id}/progression`).catch(() => null),
      appeler<{ solde: number }>('/jetons/mon-solde').catch(() => null),
    ]);

    setProfil(p);
    setProgression(pr);
    setSolde(s?.solde ?? null);
    setPhoto(await sourcePhoto('joueur', utilisateur.id, utilisateur.photoVersion));
  }, [utilisateur?.id, utilisateur?.photoVersion]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function tirerPourRafraichir() {
    setRechargement(true);
    await rafraichir();
    await charger();
    setRechargement(false);
  }

  if (!utilisateur) {
    return null;
  }

  const teinte = teinteDe(utilisateur.pseudo);

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={
          <RefreshControl
            refreshing={rechargement}
            onRefresh={tirerPourRafraichir}
            tintColor={couleurs.accent}
          />
        }
      >
        <View style={styles.entete}>
          <View style={[styles.avatar, { backgroundColor: teinte.fond }]}>
            {photo ? (
              <Image source={photo} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitiales, { color: teinte.encre }]}>
                {initialesDe(utilisateur.pseudo)}
              </Text>
            )}
          </View>
          <View style={styles.identite}>
            <Titre>{utilisateur.pseudo}</Titre>
            <Aide>{utilisateur.email}</Aide>
          </View>
        </View>

        {progression && (
          <Carte>
            <View style={styles.ligneEntete}>
              <SousTitre>Progression</SousTitre>
              <Badge texte={`Niveau ${progression.niveau}`} ton="accent" />
            </View>
            <View style={styles.piste}>
              <View
                style={[
                  styles.jauge,
                  { width: `${Math.min(100, progression.progressionVersNiveauSuivant)}%` },
                ]}
              />
            </View>
            <Aide>
              {progression.xpNiveauActuel} / {progression.xpProchainNiveau} XP avant le niveau{' '}
              {progression.niveau + 1} · {progression.xpTotal} XP au total
            </Aide>
          </Carte>
        )}

        {solde !== null && (
          <Carte>
            <SousTitre>Mes jetons</SousTitre>
            <View style={styles.ligneSolde}>
              <Text style={styles.solde}>{solde}</Text>
              <Text style={styles.soldeUnite}>jeton{solde > 1 ? 's' : ''}</Text>
            </View>
            <Aide>À dépenser chez les commerces partenaires, ou à donner à une cause.</Aide>
          </Carte>
        )}

        <Carte>
          <SousTitre>Mon style de jeu</SousTitre>
          {profil?.questionnaireCompletedAt ? (
            ARCHETYPES.map(([cle, nom]) => (
              <View key={cle} style={styles.score}>
                <Text style={styles.scoreNom}>{nom}</Text>
                <View style={styles.pisteFine}>
                  <View
                    style={[
                      styles.jauge,
                      { width: `${Math.max(0, Math.min(100, profil[cle] as number))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.scoreValeur}>{Math.round(profil[cle] as number)}</Text>
              </View>
            ))
          ) : (
            <Aide>
              Tu n'as pas encore répondu au questionnaire : l'application ne sait pas
              encore quelles missions te proposer.
            </Aide>
          )}
        </Carte>

        <Bouton titre="Se déconnecter" variante="discret" onPress={deconnecter} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  entete: { flexDirection: 'row', alignItems: 'center', gap: espaces.lg, marginBottom: espaces.sm },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: rayons.plein,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitiales: { fontSize: 24, fontWeight: '700' },
  identite: { flex: 1, gap: 2 },

  ligneEntete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  piste: { height: 8, borderRadius: rayons.plein, backgroundColor: couleurs.nuit, overflow: 'hidden' },
  pisteFine: { flex: 1, height: 5, borderRadius: rayons.plein, backgroundColor: couleurs.nuit, overflow: 'hidden' },
  jauge: { height: '100%', borderRadius: rayons.plein, backgroundColor: couleurs.accent },

  ligneSolde: { flexDirection: 'row', alignItems: 'baseline', gap: espaces.sm },
  solde: { fontSize: 40, fontWeight: '700', color: couleurs.encre, letterSpacing: -1 },
  soldeUnite: { ...typo.petit, color: couleurs.encreDouce },

  score: { flexDirection: 'row', alignItems: 'center', gap: espaces.md },
  scoreNom: { ...typo.petit, color: couleurs.encreDouce, width: 104 },
  scoreValeur: { ...typo.petit, color: couleurs.encreDouce, width: 26, textAlign: 'right' },
});
