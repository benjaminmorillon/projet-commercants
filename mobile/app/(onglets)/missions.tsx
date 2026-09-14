/**
 * Les missions, en arbre.
 *
 * Le serveur envoie l'arbre déjà calculé : cinq voies colorées, des paliers
 * de plus en plus exigeants, l'état de chaque nœud et la récompense réelle.
 * Cet écran ne recalcule rien — il dessine, et renvoie la demande de
 * validation. Les règles de déblocage vivent d'un seul côté.
 *
 * Deux gestes, comme avant : trouver une mission qui donne envie, et dire
 * qu'on l'a faite. L'arbre change seulement la façon de la trouver — au lieu
 * d'une liste de 43 lignes équivalentes, un chemin où l'on voit ce qui est
 * ouvert, ce qui vient ensuite, et ce que ça rapportera de plus.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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

type EtatNoeud = 'accomplie' | 'ouverte' | 'a_venir' | 'verrouillee';

interface Noeud {
  missionId: string;
  titre: string;
  description: string;
  theme: string;
  duree: string;
  modeInteraction: string;
  businessId: string | null;
  effort: number;
  recompenseBase: number;
  recompense: number;
  etat: EtatNoeud;
  condition: string | null;
}

interface Palier {
  numero: number;
  nom: string;
  ouvert: boolean;
  condition: string | null;
  multiplicateur: number;
  requises: number;
  accomplies: number;
  total: number;
  noeuds: Noeud[];
}

interface Voie {
  id: string;
  nom: string;
  devise: string;
  couleur: string;
  rang: number | null;
  ouverte: boolean;
  niveauRequis: number;
  condition: string | null;
  accomplies: number;
  total: number;
  paliers: Palier[];
}

interface Arbre {
  niveau: number;
  voies: Voie[];
  accomplies: number;
  total: number;
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
  const [arbre, setArbre] = useState<Arbre | null>(null);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  // Où se joue chaque mission. Sans ce nom, une mission rattachée à un
  // commerce n'est qu'un titre hors sol — et on ne découvre qu'il fallait y
  // aller qu'au moment où le serveur refuse la demande.
  const [nomDuLieu, setNomDuLieu] = useState<Map<string, string>>(new Map());
  const [voieChoisie, setVoieChoisie] = useState<string | null>(null);
  const [rechargement, setRechargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [ouvert, setOuvert] = useState<{ noeud: Noeud; palier: Palier; voie: Voie } | null>(null);

  const charger = useCallback(async () => {
    if (!utilisateur) return;
    setErreur('');
    try {
      const [mots, monArbre, mesDemandes, deblocage, lieux] = await Promise.all([
        appeler<Vocabulaire>('/missions/vocabulaire'),
        appeler<Arbre>('/missions/arbre'),
        appeler<Demande[]>(`/players/${utilisateur.id}/validations/requested`).catch(() => []),
        appeler<Quota>(`/players/${utilisateur.id}/deblocage`).catch(() => null),
        appeler<Lieu[]>('/businesses').catch(() => [] as Lieu[]),
      ]);
      setVocabulaire(mots);
      setArbre(monArbre);
      setDemandes(mesDemandes);
      setQuota(deblocage);
      setNomDuLieu(new Map(lieux.map((l) => [l.id, l.nom])));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [utilisateur?.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  // La voie regardée. Par défaut celle du joueur : celle qui colle à son
  // profil, et qui est ouverte.
  const voie = useMemo<Voie | null>(() => {
    if (!arbre) return null;
    return (
      arbre.voies.find((v) => v.id === voieChoisie) ??
      arbre.voies.find((v) => v.ouverte && v.rang === 1) ??
      arbre.voies[0] ??
      null
    );
  }, [arbre, voieChoisie]);

  function statutDe(missionId: string): Demande['statut'] | null {
    return demandes.find((d) => d.missionId === missionId)?.statut ?? null;
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

        {arbre && (
          <Aide>
            Niveau {arbre.niveau} — {arbre.accomplies} mission
            {arbre.accomplies > 1 ? 's' : ''} accomplie{arbre.accomplies > 1 ? 's' : ''} sur{' '}
            {arbre.total}. Plus une mission est haut dans sa voie, plus elle rapporte.
          </Aide>
        )}

        {quota && (
          <Aide>
            {quota.missionsDuJour.restantes > 0
              ? `Il te reste ${quota.missionsDuJour.restantes} mission${quota.missionsDuJour.restantes > 1 ? 's' : ''} à lancer aujourd'hui (${quota.missionsDuJour.utilisees} / ${quota.missionsDuJour.limite}).`
              : `Tu as fait tes ${quota.missionsDuJour.limite} missions du jour. La limite augmente d'une mission à chaque niveau.`}
          </Aide>
        )}

        <Erreur>{erreur}</Erreur>

        {arbre && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.voies}
          >
            {arbre.voies.map((v) => (
              <PastilleVoie
                key={v.id}
                voie={v}
                actif={v.id === voie?.id}
                onPress={() => setVoieChoisie(v.id)}
              />
            ))}
          </ScrollView>
        )}

        {voie && (
          <>
            <Text style={styles.devise}>{voie.devise}</Text>

            {!voie.ouverte && voie.condition && (
              <Carte style={styles.verrou}>
                <Text style={styles.verrouTexte}>🔒 {voie.condition}</Text>
              </Carte>
            )}

            {voie.paliers.map((palier) => (
              <Carte key={palier.numero} style={{ ...styles.palier, borderLeftColor: palier.ouvert ? voie.couleur : couleurs.traitFort }}>
                <View style={styles.palierEntete}>
                  <SousTitre>
                    {palier.numero}. {palier.nom}
                  </SousTitre>
                  <Text style={styles.palierCompte}>
                    {palier.accomplies} / {palier.total}
                  </Text>
                </View>

                {palier.multiplicateur > 1 && (
                  <Text style={[styles.prime, { color: voie.couleur }]}>
                    +{Math.round((palier.multiplicateur - 1) * 100)} % de récompense à ce palier
                  </Text>
                )}

                {palier.condition && <Aide>{palier.condition}</Aide>}

                {palier.noeuds.map((noeud) => (
                  <LigneNoeud
                    key={noeud.missionId}
                    noeud={noeud}
                    voie={voie}
                    vocabulaire={vocabulaire}
                    statut={statutDe(noeud.missionId)}
                    onPress={() => setOuvert({ noeud, palier, voie })}
                  />
                ))}
              </Carte>
            ))}
          </>
        )}
      </ScrollView>

      <FeuilleDeMission
        ouvert={ouvert}
        statut={ouvert ? statutDe(ouvert.noeud.missionId) : null}
        lieu={
          ouvert?.noeud.businessId ? nomDuLieu.get(ouvert.noeud.businessId) ?? null : null
        }
        vocabulaire={vocabulaire}
        onFermer={() => setOuvert(null)}
        onFait={async () => {
          setOuvert(null);
          await charger();
        }}
      />
    </SafeAreaView>
  );
}

function libelle(termes: Terme[] | undefined, valeur: string): string {
  return termes?.find((t) => t.valeur === valeur)?.libelle ?? valeur;
}

/** Une branche de l'arbre, avec sa couleur et sa progression. */
function PastilleVoie({
  voie,
  actif,
  onPress,
}: {
  voie: Voie;
  actif: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.voie,
        actif && { borderColor: voie.couleur, backgroundColor: couleurs.surface },
        !voie.ouverte && styles.voieFermee,
      ]}
    >
      <Text style={[styles.voieNom, actif && { color: couleurs.encre }]}>{voie.nom}</Text>
      <Text style={[styles.voieCompte, actif && { color: voie.couleur }]}>
        {voie.ouverte ? `${voie.accomplies} / ${voie.total}` : `🔒 niveau ${voie.niveauRequis}`}
      </Text>
      <View style={styles.jauge}>
        <View
          style={{
            height: 3,
            borderRadius: rayons.plein,
            backgroundColor: voie.couleur,
            width: `${voie.total ? Math.round((voie.accomplies / voie.total) * 100) : 0}%`,
          }}
        />
      </View>
    </Pressable>
  );
}

/**
 * Un nœud de l'arbre. La pastille porte tout l'état : pleine quand c'est
 * fait, cerclée de la couleur de la voie quand c'est jouable, éteinte quand
 * ça ne l'est pas encore.
 */
function LigneNoeud({
  noeud,
  voie,
  vocabulaire,
  statut,
  onPress,
}: {
  noeud: Noeud;
  voie: Voie;
  vocabulaire: Vocabulaire | null;
  statut: Demande['statut'] | null;
  onPress: () => void;
}) {
  const enAttente = statut === 'en_attente';
  const fait = noeud.etat === 'accomplie' || statut === 'validee';
  const jouable = noeud.etat === 'ouverte';

  return (
    <Pressable onPress={onPress} style={[styles.noeud, !jouable && !fait && styles.noeudEteint]}>
      <View
        style={[
          styles.pastille,
          jouable && { borderColor: voie.couleur },
          enAttente && { borderColor: couleurs.attention },
          fait && { backgroundColor: voie.couleur, borderColor: voie.couleur },
        ]}
      >
        <Text style={[styles.pastilleTexte, fait && styles.pastilleTexteFait]}>
          {fait ? '✓' : enAttente ? '⏳' : noeud.etat === 'verrouillee' ? '🔒' : ''}
        </Text>
      </View>

      <View style={styles.noeudTexte}>
        <Text style={styles.noeudTitre}>{noeud.titre}</Text>
        <Text style={styles.noeudMeta}>
          {libelle(vocabulaire?.durees, noeud.duree)} ·{' '}
          {libelle(vocabulaire?.modesInteraction, noeud.modeInteraction)} · +{noeud.recompense}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * La feuille qui monte quand on touche une mission : ce qu'elle demande, ce
 * qu'elle rapporte, et — si elle est ouverte — de quoi dire qu'on l'a faite.
 *
 * Elle pose les deux questions que le serveur exige, et rien de plus : que
 * faire de la récompense, et — pour une mission de catalogue, qui n'est
 * rattachée à aucun commerce — qui la confirmera.
 */
function FeuilleDeMission({
  ouvert,
  statut,
  lieu,
  vocabulaire,
  onFermer,
  onFait,
}: {
  ouvert: { noeud: Noeud; palier: Palier; voie: Voie } | null;
  statut: Demande['statut'] | null;
  lieu: string | null;
  vocabulaire: Vocabulaire | null;
  onFermer: () => void;
  onFait: () => void;
}) {
  const { utilisateur } = useSession();
  const [choix, setChoix] = useState<string>('depense');
  const [validateur, setValidateur] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const noeud = ouvert?.noeud ?? null;
  const surPlace = Boolean(noeud?.businessId);
  const jouable = noeud?.etat === 'ouverte' && statut !== 'en_attente' && statut !== 'validee';

  async function envoyer() {
    if (!noeud || !utilisateur) return;
    setErreur('');
    setEnCours(true);
    try {
      await appeler(`/players/${utilisateur.id}/missions/${noeud.missionId}/request-validation`, {
        methode: 'POST',
        corps: surPlace ? { choix } : { choix, validatorPseudo: validateur.trim() },
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
    <Modal visible={ouvert !== null} animationType="slide" transparent onRequestClose={onFermer}>
      <Pressable style={styles.fond} onPress={onFermer} />
      <SafeAreaView style={styles.feuille} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.feuilleContenu}>
          <View style={styles.poignee} />

          {ouvert && (
            <Text style={[styles.feuilleVoie, { color: ouvert.voie.couleur }]}>
              {ouvert.voie.nom} · palier {ouvert.palier.numero}
            </Text>
          )}
          <SousTitre>{noeud?.titre}</SousTitre>
          <Text style={styles.feuilleRecompense}>+{noeud?.recompense} jetons</Text>
          <Text style={styles.description}>{noeud?.description}</Text>

          <View style={styles.badges}>
            <Badge texte={libelle(vocabulaire?.durees, noeud?.duree ?? '')} />
            <Badge texte={libelle(vocabulaire?.themes, noeud?.theme ?? '')} />
            <Badge texte={libelle(vocabulaire?.modesInteraction, noeud?.modeInteraction ?? '')} />
          </View>

          {ouvert && ouvert.palier.multiplicateur > 1 && (
            <Aide>
              Récompense de base {noeud?.recompenseBase} jetons, plus{' '}
              {Math.round((ouvert.palier.multiplicateur - 1) * 100)} % parce que cette mission
              est au palier « {ouvert.palier.nom} ».
            </Aide>
          )}

          {statut === 'validee' || noeud?.etat === 'accomplie' ? (
            <Badge texte="Mission accomplie" ton="positif" />
          ) : statut === 'en_attente' ? (
            <Badge texte="En attente de validation" ton="attention" />
          ) : !jouable ? (
            <Carte style={styles.verrou}>
              <Text style={styles.verrouTexte}>
                🔒{' '}
                {noeud?.condition ??
                  "Cette mission n'est pas encore ouverte : termine d'abord celles qui la précèdent."}
              </Text>
            </Carte>
          ) : (
            <>
              <Aide>Que veux-tu faire de tes {noeud?.recompense} jetons ?</Aide>

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
            </>
          )}

          <Bouton titre="Fermer" variante="discret" onPress={onFermer} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  voies: { gap: espaces.sm, paddingVertical: espaces.xs },
  voie: {
    width: 158,
    gap: 6,
    paddingHorizontal: espaces.lg,
    paddingVertical: espaces.md,
    borderRadius: rayons.md,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.trait,
  },
  voieFermee: { opacity: 0.55 },
  voieNom: { ...typo.petit, fontWeight: '600', color: couleurs.encreDouce },
  voieCompte: { ...typo.minuscule, color: couleurs.encreFaible },
  jauge: {
    height: 3,
    borderRadius: rayons.plein,
    backgroundColor: couleurs.traitFort,
    overflow: 'hidden',
  },

  devise: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 20 },

  // Le trait de couleur sur le bord gauche : c'est lui qui fait la branche.
  palier: { borderLeftWidth: 3, gap: espaces.sm },
  palierEntete: { flexDirection: 'row', alignItems: 'center', gap: espaces.sm },
  palierCompte: { ...typo.petit, color: couleurs.encreFaible, marginLeft: 'auto' },
  prime: { ...typo.minuscule },

  noeud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.md,
    padding: espaces.md,
    borderRadius: rayons.sm,
    backgroundColor: couleurs.nuit,
    borderWidth: 1,
    borderColor: couleurs.trait,
  },
  noeudEteint: { opacity: 0.5 },
  pastille: {
    width: 26,
    height: 26,
    borderRadius: rayons.plein,
    borderWidth: 2,
    borderColor: couleurs.traitFort,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleTexte: { fontSize: 12, color: couleurs.encreFaible },
  // Fond clair et vif : le signe dessus doit être sombre, pas blanc.
  pastilleTexteFait: { color: couleurs.nuit, fontWeight: '700' },
  noeudTexte: { flex: 1, gap: 2 },
  noeudTitre: { fontSize: 14.5, fontWeight: '500', color: couleurs.encre },
  noeudMeta: { ...typo.petit, color: couleurs.encreFaible },

  verrou: { backgroundColor: couleurs.attentionDoux, borderColor: 'rgba(251, 191, 36, 0.3)' },
  verrouTexte: { ...typo.petit, color: couleurs.attention, lineHeight: 20 },

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
  feuilleVoie: { ...typo.minuscule, textTransform: 'uppercase' },
  feuilleRecompense: { ...typo.sousTitre, color: couleurs.positif },
  description: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 20 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.sm },

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
