/**
 * Les missions à deux.
 *
 * Le principe du jeu : on ne choisit pas son partenaire, c'est l'application
 * qui l'apparie — d'après le profil, et selon ce qu'on demande (quelqu'un qui
 * me ressemble, ou quelqu'un qui me complète).
 *
 * Et son pseudo n'apparaît qu'une fois les deux d'accord. C'est volontaire :
 * accepter parce qu'on a reconnu le nom, ou refuser pour la même raison, ce
 * n'est plus un appariement, c'est un carnet d'adresses.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler } from '../../src/api/client';
import { useSession } from '../../src/api/session';
import { Aide, Badge, Bouton, Carte, Erreur, SousTitre, Titre } from '../../src/design/composants';
import { couleurs, espaces, typo } from '../../src/design/theme';
import { Retour } from './amis';

type Statut = 'proposee' | 'acceptee' | 'refusee' | 'accomplie' | 'annulee';

interface Duo {
  id: string;
  statut: Statut;
  typeMatching: 'affinite_naturelle' | 'defi_complementarite';
  scoreAffinite: number;
  creneauDebut: string | null;
  monStatut: string;
  jaiConfirme: boolean;
  partenaireAConfirme: boolean;
  partenaireStatut: string;
  partenairePseudo: string | null;
  mission: {
    titre: string;
    description: string;
    phaseRelationnelle: string | null;
    recompenseBase: number;
  } | null;
  lieu: { nom: string; adresse: string } | null;
}

const TYPES = [
  {
    valeur: 'affinite_naturelle',
    titre: 'Quelqu’un qui me ressemble',
    aide: 'Un profil proche du tien. Le courant passe vite, la mission se fait sans friction.',
  },
  {
    valeur: 'defi_complementarite',
    titre: 'Quelqu’un qui me complète',
    aide: 'Un profil opposé au tien. Plus inconfortable, souvent plus mémorable.',
  },
] as const;

const LIBELLES_STATUT: Record<Statut, { texte: string; ton: 'positif' | 'attention' | 'neutre' }> = {
  proposee: { texte: 'En attente de réponse', ton: 'attention' },
  acceptee: { texte: 'Duo formé', ton: 'positif' },
  refusee: { texte: 'Refusé', ton: 'neutre' },
  accomplie: { texte: 'Mission accomplie', ton: 'positif' },
  annulee: { texte: 'Annulé', ton: 'neutre' },
};

export default function Duos() {
  const { utilisateur } = useSession();
  const [duos, setDuos] = useState<Duo[]>([]);
  const [type, setType] = useState<string>('affinite_naturelle');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [rechargement, setRechargement] = useState(false);

  const charger = useCallback(async () => {
    if (!utilisateur) return;
    setErreur('');
    try {
      setDuos(await appeler<Duo[]>(`/players/${utilisateur.id}/duos`));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [utilisateur?.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function agir(chemin: string, corps?: unknown) {
    if (!utilisateur) return;
    setErreur('');
    setEnCours(true);
    try {
      await appeler(chemin, { methode: 'POST', corps });
      await charger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  const enCoursDeJeu = duos.filter((d) => d.statut === 'proposee' || d.statut === 'acceptee');
  const passes = duos.filter((d) => !enCoursDeJeu.includes(d));

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
        <Retour />
        <Titre>Duos</Titre>
        <Aide>
          Tu ne choisis pas ton partenaire : l'application l'apparie d'après ton profil. Son
          pseudo n'apparaît qu'une fois que vous avez tous les deux accepté.
        </Aide>

        <Erreur>{erreur}</Erreur>

        {enCoursDeJeu.length === 0 && (
          <Carte>
            <SousTitre>Lancer un duo</SousTitre>
            {TYPES.map((t) => (
              <Pressable
                key={t.valeur}
                onPress={() => setType(t.valeur)}
                style={[styles.choix, type === t.valeur && styles.choixActif]}
              >
                <Text style={styles.choixTitre}>{t.titre}</Text>
                <Text style={styles.choixAide}>{t.aide}</Text>
              </Pressable>
            ))}
            <Bouton
              titre="Trouver un partenaire"
              charge={enCours}
              onPress={() =>
                agir(`/players/${utilisateur?.id}/duos`, { typeMatching: type })
              }
            />
          </Carte>
        )}

        {enCoursDeJeu.map((duo) => (
          <CarteDuo key={duo.id} duo={duo} enCours={enCours} onAgir={agir} moi={utilisateur?.id} />
        ))}

        {passes.length > 0 && (
          <Carte>
            <SousTitre>Duos passés</SousTitre>
            {passes.map((duo) => (
              <View key={duo.id} style={styles.passe}>
                <Text style={styles.passeTitre}>{duo.mission?.titre ?? 'Mission'}</Text>
                <Badge
                  texte={LIBELLES_STATUT[duo.statut].texte}
                  ton={LIBELLES_STATUT[duo.statut].ton === 'neutre' ? undefined : LIBELLES_STATUT[duo.statut].ton}
                />
              </View>
            ))}
          </Carte>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CarteDuo({
  duo,
  enCours,
  onAgir,
  moi,
}: {
  duo: Duo;
  enCours: boolean;
  onAgir: (chemin: string, corps?: unknown) => Promise<void>;
  moi: string | undefined;
}) {
  const libelle = LIBELLES_STATUT[duo.statut];
  const aRepondre = duo.statut === 'proposee' && duo.monStatut === 'invite';
  const aConfirmer = duo.statut === 'acceptee' && !duo.jaiConfirme;

  return (
    <Carte style={styles.duo}>
      <View style={styles.enteteDuo}>
        <SousTitre>{duo.mission?.titre ?? 'Mission à deux'}</SousTitre>
        <Badge texte={libelle.texte} ton={libelle.ton === 'neutre' ? undefined : libelle.ton} />
      </View>

      {Boolean(duo.mission?.description) && (
        <Text style={styles.description}>{duo.mission?.description}</Text>
      )}

      {duo.lieu && <Text style={styles.lieu}>◈ {duo.lieu.nom} — {duo.lieu.adresse}</Text>}

      <Text style={styles.partenaire}>
        {duo.partenairePseudo
          ? `Avec ${duo.partenairePseudo}`
          : 'Ton partenaire reste anonyme tant que vous n’avez pas accepté tous les deux.'}
      </Text>

      <Aide>
        {duo.typeMatching === 'affinite_naturelle'
          ? 'Appariement par affinité : un profil proche du tien.'
          : 'Appariement par complémentarité : un profil qui t’oppose.'}
      </Aide>

      {aRepondre && (
        <View style={styles.actions}>
          <Bouton
            titre="Accepter"
            charge={enCours}
            onPress={() => onAgir(`/duos/${duo.id}/accepter/${moi}`)}
          />
          <Bouton
            titre="Refuser"
            variante="discret"
            onPress={() => onAgir(`/duos/${duo.id}/refuser/${moi}`)}
          />
        </View>
      )}

      {aConfirmer && (
        <Bouton
          titre="On l'a faite"
          charge={enCours}
          onPress={() => onAgir(`/duos/${duo.id}/confirmer/${moi}`, {})}
        />
      )}

      {duo.statut === 'acceptee' && duo.jaiConfirme && !duo.partenaireAConfirme && (
        <Aide>
          Tu as confirmé. La récompense tombe quand ton partenaire confirmera de son côté — il
          faut être deux à dire que c'est fait.
        </Aide>
      )}
    </Carte>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  choix: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: couleurs.trait,
    backgroundColor: couleurs.nuit,
    padding: espaces.lg,
    gap: 4,
  },
  choixActif: { borderColor: couleurs.accent, backgroundColor: couleurs.accentDoux },
  choixTitre: { fontSize: 14.5, fontWeight: '600', color: couleurs.encre },
  choixAide: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 19 },

  duo: { gap: espaces.sm },
  enteteDuo: { flexDirection: 'row', alignItems: 'center', gap: espaces.sm, flexWrap: 'wrap' },
  description: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 20 },
  lieu: { ...typo.petit, fontWeight: '600', color: couleurs.accentEncre },
  partenaire: { ...typo.corps, color: couleurs.encre },
  actions: { gap: espaces.sm },

  passe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.sm,
    paddingVertical: espaces.sm,
  },
  passeTitre: { flex: 1, ...typo.petit, color: couleurs.encreDouce },
});
