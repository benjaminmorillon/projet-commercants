/**
 * Les missions.
 *
 * Deux gestes, et rien d'autre : trouver une mission qui donne envie, et dire
 * qu'on l'a faite.
 *
 * Dire qu'on l'a faite n'est pas immédiat : il faut choisir ce qu'on veut de
 * la récompense, et quelqu'un doit confirmer (le commerçant si la mission est
 * rattachée à un lieu, un autre joueur sinon). Ce choix se fait dans une
 * feuille qui monte, pour ne pas quitter la liste.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler } from '../../src/api/client';
import { useSession } from '../../src/api/session';
import {
  Aide,
  Badge,
  Bouton,
  Carte,
  Champ,
  Erreur,
  SousTitre,
  Titre,
} from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface Terme {
  valeur: string;
  libelle: string;
}

interface Vocabulaire {
  archetypes: Terme[];
  durees: Terme[];
  themes: Terme[];
  modesInteraction: Terme[];
}

interface Mission {
  id: string;
  titre: string;
  description: string;
  archetypeDominant: string;
  duree: string;
  theme: string;
  modeInteraction: string;
  recompenseBase: number;
  businessId: string | null;
}

interface Demande {
  missionId: string;
  statut: 'en_attente' | 'validee' | 'refusee';
}

interface Quota {
  missionsDuJour: { limite: number; utilisees: number; restantes: number };
}

interface Lieu {
  id: string;
  nom: string;
}

const CHOIX_RECOMPENSE = [
  {
    valeur: 'depense',
    titre: 'Dépenser chez un partenaire',
    aide: 'Les jetons arrivent sur ton compte, à régler chez un commerce du quartier.',
  },
  {
    valeur: 'don',
    titre: 'Donner à une cause',
    aide: 'La récompense part directement à une cause soutenue par le jeu.',
  },
  {
    valeur: 'accumulation',
    titre: 'Accumuler',
    aide: 'Tu gardes tes jetons pour plus tard.',
  },
] as const;

export default function Missions() {
  const { utilisateur } = useSession();
  const [vocabulaire, setVocabulaire] = useState<Vocabulaire | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  // Où se joue chaque mission. Sans ce nom, une mission rattachée à un
  // commerce n'est qu'un titre hors sol — et on ne découvre qu'il fallait y
  // aller qu'au moment où le serveur refuse la demande.
  const [nomDuLieu, setNomDuLieu] = useState<Map<string, string>>(new Map());
  const [theme, setTheme] = useState<string | null>(null);
  const [rechargement, setRechargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [aTerminer, setATerminer] = useState<Mission | null>(null);

  const charger = useCallback(async () => {
    if (!utilisateur) return;
    setErreur('');
    try {
      const [mots, liste, mesDemandes, deblocage, lieux] = await Promise.all([
        appeler<Vocabulaire>('/missions/vocabulaire'),
        appeler<Mission[]>(`/missions${theme ? `?theme=${encodeURIComponent(theme)}` : ''}`),
        appeler<Demande[]>(`/players/${utilisateur.id}/validations/requested`).catch(() => []),
        appeler<Quota>(`/players/${utilisateur.id}/deblocage`).catch(() => null),
        appeler<Lieu[]>('/businesses').catch(() => [] as Lieu[]),
      ]);
      setVocabulaire(mots);
      setMissions(liste);
      setDemandes(mesDemandes);
      setQuota(deblocage);
      setNomDuLieu(new Map(lieux.map((l) => [l.id, l.nom])));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [utilisateur?.id, theme]);

  useEffect(() => {
    charger();
  }, [charger]);

  function statutDe(mission: Mission): Demande['statut'] | null {
    return demandes.find((d) => d.missionId === mission.id)?.statut ?? null;
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
              await charger();
              setRechargement(false);
            }}
            tintColor={couleurs.accent}
          />
        }
      >
        <Titre>Missions</Titre>

        {quota && (
          <Aide>
            {quota.missionsDuJour.restantes > 0
              ? `Il te reste ${quota.missionsDuJour.restantes} mission${quota.missionsDuJour.restantes > 1 ? 's' : ''} à lancer aujourd'hui (${quota.missionsDuJour.utilisees} / ${quota.missionsDuJour.limite}).`
              : `Tu as fait tes ${quota.missionsDuJour.limite} missions du jour. La limite augmente d'une mission à chaque niveau.`}
          </Aide>
        )}

        {vocabulaire && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtres}
          >
            <Pastille texte="Tous" actif={theme === null} onPress={() => setTheme(null)} />
            {vocabulaire.themes.map((t) => (
              <Pastille
                key={t.valeur}
                texte={t.libelle}
                actif={theme === t.valeur}
                onPress={() => setTheme(t.valeur)}
              />
            ))}
          </ScrollView>
        )}

        <Erreur>{erreur}</Erreur>

        <Aide>
          {missions.length} mission{missions.length > 1 ? 's' : ''}
          {theme ? ' dans ce thème' : ''}
        </Aide>

        {missions.map((mission) => {
          const statut = statutDe(mission);
          return (
            <Carte key={mission.id}>
              <View style={styles.enteteMission}>
                <SousTitre>{mission.titre}</SousTitre>
                <Text style={styles.recompense}>+{mission.recompenseBase}</Text>
              </View>
              <Text style={styles.description}>{mission.description}</Text>

              {mission.businessId && (
                <Text style={styles.lieu}>
                  ◈ {nomDuLieu.get(mission.businessId) ?? 'Un commerce partenaire'}
                </Text>
              )}

              <View style={styles.badges}>
                <Badge texte={libelle(vocabulaire?.archetypes, mission.archetypeDominant)} />
                <Badge texte={libelle(vocabulaire?.durees, mission.duree)} />
                <Badge texte={libelle(vocabulaire?.themes, mission.theme)} />
                <Badge texte={libelle(vocabulaire?.modesInteraction, mission.modeInteraction)} />
              </View>

              {statut === 'en_attente' ? (
                <Badge texte="En attente de validation" ton="attention" />
              ) : statut === 'validee' ? (
                <Badge texte="Mission accomplie" ton="positif" />
              ) : (
                <Bouton
                  titre="J'ai terminé cette mission"
                  onPress={() => setATerminer(mission)}
                />
              )}
            </Carte>
          );
        })}
      </ScrollView>

      <FeuilleDeValidation
        mission={aTerminer}
        lieu={aTerminer?.businessId ? nomDuLieu.get(aTerminer.businessId) ?? null : null}
        onFermer={() => setATerminer(null)}
        onFait={async () => {
          setATerminer(null);
          await charger();
        }}
      />
    </SafeAreaView>
  );
}

function libelle(termes: Terme[] | undefined, valeur: string): string {
  return termes?.find((t) => t.valeur === valeur)?.libelle ?? valeur;
}

function Pastille({
  texte,
  actif,
  onPress,
}: {
  texte: string;
  actif: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pastille, actif && styles.pastilleActive]}>
      <Text style={[styles.pastilleTexte, actif && styles.pastilleTexteActif]}>{texte}</Text>
    </Pressable>
  );
}

/**
 * La feuille qui monte pour dire « j'ai terminé ».
 *
 * Elle pose les deux questions que le serveur exige, et rien de plus : que
 * faire de la récompense, et — pour une mission de catalogue, qui n'est
 * rattachée à aucun commerce — qui la confirmera.
 */
function FeuilleDeValidation({
  mission,
  lieu,
  onFermer,
  onFait,
}: {
  mission: Mission | null;
  lieu: string | null;
  onFermer: () => void;
  onFait: () => void;
}) {
  const { utilisateur } = useSession();
  const [choix, setChoix] = useState<string>('depense');
  const [validateur, setValidateur] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const surPlace = Boolean(mission?.businessId);

  async function envoyer() {
    if (!mission || !utilisateur) return;
    setErreur('');
    setEnCours(true);
    try {
      await appeler(`/players/${utilisateur.id}/missions/${mission.id}/request-validation`, {
        methode: 'POST',
        corps: surPlace
          ? { choix }
          : { choix, validatorPseudo: validateur.trim() },
      });
      setValidateur('');
      onFait();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Modal
      visible={mission !== null}
      animationType="slide"
      transparent
      onRequestClose={onFermer}
    >
      <Pressable style={styles.fond} onPress={onFermer} />
      <SafeAreaView style={styles.feuille} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.feuilleContenu}>
          <View style={styles.poignee} />
          <SousTitre>{mission?.titre}</SousTitre>
          <Aide>Que veux-tu faire de tes {mission?.recompenseBase} jetons ?</Aide>

          {CHOIX_RECOMPENSE.map((c) => (
            <Pressable
              key={c.valeur}
              onPress={() => setChoix(c.valeur)}
              style={[styles.choix, choix === c.valeur && styles.choixActif]}
            >
              <Text style={styles.choixTitre}>{c.titre}</Text>
              <Text style={styles.choixAide}>{c.aide}</Text>
            </Pressable>
          ))}

          {!surPlace && (
            <Champ
              etiquette="Qui peut confirmer ?"
              value={validateur}
              onChangeText={setValidateur}
              placeholder="Le pseudo exact d'un autre joueur"
              autoCapitalize="none"
            />
          )}

          {surPlace && (
            <Aide>
              Cette mission se joue {lieu ? `au ${lieu}` : 'dans un commerce partenaire'} :
              c'est lui qui confirmera. Il faut y avoir validé ta venue — sinon la demande
              sera refusée.
            </Aide>
          )}

          <Erreur>{erreur}</Erreur>

          <Bouton titre="Envoyer la demande" onPress={envoyer} charge={enCours} />
          <Bouton titre="Annuler" variante="discret" onPress={onFermer} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  filtres: { gap: espaces.sm, paddingVertical: espaces.xs },
  pastille: {
    paddingHorizontal: espaces.lg,
    paddingVertical: 9,
    borderRadius: rayons.plein,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.trait,
  },
  pastilleActive: { backgroundColor: couleurs.accent, borderColor: couleurs.accent },
  pastilleTexte: { ...typo.petit, fontWeight: '600', color: couleurs.encreDouce },
  pastilleTexteActif: { color: couleurs.encreInverse },

  enteteMission: { flexDirection: 'row', alignItems: 'flex-start', gap: espaces.md },
  recompense: {
    ...typo.sousTitre,
    color: couleurs.accentEncre,
    marginLeft: 'auto',
  },
  description: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 20 },
  lieu: { ...typo.petit, color: couleurs.accentEncre, fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.sm },

  fond: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  feuille: {
    backgroundColor: couleurs.carte,
    borderTopLeftRadius: rayons.lg,
    borderTopRightRadius: rayons.lg,
    borderTopWidth: 1,
    borderColor: couleurs.traitFort,
    maxHeight: '86%',
  },
  feuilleContenu: { padding: espaces.xl, gap: espaces.md },
  poignee: {
    width: 40,
    height: 4,
    borderRadius: rayons.plein,
    backgroundColor: couleurs.traitFort,
    alignSelf: 'center',
    marginBottom: espaces.sm,
  },

  choix: {
    borderRadius: rayons.md,
    borderWidth: 1,
    borderColor: couleurs.trait,
    backgroundColor: couleurs.nuit,
    padding: espaces.lg,
    gap: 4,
  },
  choixActif: { borderColor: couleurs.accent, backgroundColor: couleurs.accentDoux },
  choixTitre: { fontSize: 14.5, fontWeight: '600', color: couleurs.encre },
  choixAide: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 19 },
});
