/**
 * Les offres des commerçants.
 *
 * Trois choses sur un écran :
 *   1. une barre de recherche — c'est par elle qu'on trouve une offre quand
 *      on cherche quelque chose de précis ;
 *   2. les offres en cours, dont la lecture rapporte des jetons ;
 *   3. les bons obtenus, à montrer au commerçant au moment de payer.
 *
 * Ouvrir une offre déplace de l'argent : le commerçant paie le joueur pour
 * l'avoir lue. Le serveur décide seul s'il paie, et l'écran dit toujours
 * pourquoi — un refus silencieux passerait pour une panne.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler, urlPhoto } from '../../src/api/client';
import { useSession } from '../../src/api/session';
import {
  Aide,
  Badge,
  Bouton,
  Carte,
  Erreur,
  SousTitre,
  Titre,
} from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface Offre {
  id: string;
  titre: string;
  description: string;
  offre: string;
  reduction: string;
  commerce: string;
  businessId: string;
  photoVersion: number | null;
  finLe: string;
  gainPossible: number;
  dejaOuverte: boolean;
  dejaPayee: boolean;
}

interface Bon {
  id: string;
  publiciteId: string;
  titre: string;
  offre: string;
  reduction: string;
  commerce: string;
  photoVersion: number | null;
  obtenuLe: string;
  utiliseLe: string | null;
  finLe: string;
  valable: boolean;
}

type Paiement = { paye: true; montant: number } | { paye: false; raison: string };

export default function Offres() {
  const { utilisateur } = useSession();
  const [requete, setRequete] = useState('');
  const [offres, setOffres] = useState<Offre[]>([]);
  const [bons, setBons] = useState<Bon[]>([]);
  const [rechargement, setRechargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  // Ce que la dernière ouverture a donné, par offre. Gardé ici pour pouvoir
  // l'afficher après le rechargement de la liste.
  const [resultats, setResultats] = useState<Record<string, Paiement>>({});

  const charger = useCallback(
    async (terme = requete) => {
      if (!utilisateur) return;
      setErreur('');
      try {
        const [liste, mesBons] = await Promise.all([
          appeler<Offre[]>(`/offres?q=${encodeURIComponent(terme.trim())}`),
          appeler<Bon[]>('/offres/mes-bons'),
        ]);
        setOffres(liste);
        setBons(mesBons);
      } catch (e) {
        setErreur((e as Error).message);
      }
    },
    [utilisateur?.id, requete],
  );

  useEffect(() => {
    charger('');
    // Au premier affichage seulement : ensuite c'est la recherche qui pilote.
  }, [utilisateur?.id]);

  async function ouvrir(offre: Offre) {
    setEnCours(offre.id);
    setErreur('');
    try {
      const reponse = await appeler<{ paiement: Paiement }>(`/offres/${offre.id}/ouvrir`, {
        methode: 'POST',
      });
      setResultats((avant) => ({ ...avant, [offre.id]: reponse.paiement }));
      await charger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(null);
    }
  }

  // Les bons utilisables d'abord : c'est ce qu'on vient chercher ici.
  const bonsRanges = [...bons].sort((a, b) => Number(b.valable) - Number(a.valable));

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contenu}
        keyboardShouldPersistTaps="handled"
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
        <Titre>Offres</Titre>
        <Aide>
          Les bons plans des commerces du quartier. Les ouvrir te rapporte des jetons, et te
          donne la réduction.
        </Aide>

        <View style={styles.recherche}>
          <TextInput
            style={styles.champ}
            value={requete}
            onChangeText={setRequete}
            onSubmitEditing={() => charger()}
            placeholder="Une pizza, une coupe de cheveux…"
            placeholderTextColor={couleurs.encreFaible}
            returnKeyType="search"
            autoCapitalize="none"
          />
          <Bouton titre="Chercher" onPress={() => charger()} />
        </View>

        <Erreur>{erreur}</Erreur>

        <Aide>
          {requete.trim()
            ? `${offres.length} offre${offres.length > 1 ? 's' : ''} pour « ${requete.trim()} ».`
            : `${offres.length} offre${offres.length > 1 ? 's' : ''} en cours dans le quartier.`}
        </Aide>

        {offres.length === 0 && (
          <Aide>
            {requete.trim()
              ? "Aucune offre ne parle de ça pour le moment. Essaie un autre mot."
              : "Aucun commerce n'a d'offre en cours."}
          </Aide>
        )}

        {offres.map((offre) => (
          <CarteOffre
            key={offre.id}
            offre={offre}
            resultat={resultats[offre.id]}
            enCours={enCours === offre.id}
            onOuvrir={() => ouvrir(offre)}
          />
        ))}

        {bons.length > 0 && (
          <>
            <SousTitre>Mes bons</SousTitre>
            <Aide>Montre le bon au commerçant au moment de payer : c'est lui qui l'encaisse.</Aide>
            {bonsRanges.map((bon) => (
              <CarteBon key={bon.id} bon={bon} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** « 1 jeton », « 0.24 jeton », « 3 jetons » : le pluriel part à 2 en français. */
function jetons(montant: number): string {
  return `${montant} jeton${montant >= 2 ? 's' : ''}`;
}

function dateCourte(valeur: string | null): string {
  if (!valeur) return '';
  return new Date(valeur).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function ImageOffre({ id, version }: { id: string; version: number | null }) {
  // L'image d'une offre est publique, comme la devanture qu'elle représente :
  // pas besoin de joindre le jeton de session.
  const uri = urlPhoto('publicite', id, version);
  if (!uri) return null;
  return <Image source={{ uri }} style={styles.image} resizeMode="cover" />;
}

function CarteOffre({
  offre,
  resultat,
  enCours,
  onOuvrir,
}: {
  offre: Offre;
  resultat?: Paiement;
  enCours: boolean;
  onOuvrir: () => void;
}) {
  return (
    <Carte style={styles.carte}>
      <ImageOffre id={offre.id} version={offre.photoVersion} />
      <Text style={styles.commerce}>{offre.commerce.toUpperCase()}</Text>
      <SousTitre>{offre.titre}</SousTitre>
      <Text style={styles.accroche}>{offre.offre}</Text>

      <View style={styles.badges}>
        {Boolean(offre.reduction) && <Badge texte={offre.reduction} ton="positif" />}
        <Badge texte={`Jusqu'au ${dateCourte(offre.finLe)}`} />
      </View>

      {offre.dejaOuverte ? (
        <>
          <Text style={styles.description}>{offre.description}</Text>
          {resultat &&
            (resultat.paye ? (
              <Badge texte={`Le commerçant t'a versé ${jetons(resultat.montant)}`} ton="positif" />
            ) : (
              <Aide>Offre ouverte et bon obtenu. {resultat.raison}</Aide>
            ))}
          <Aide>Ce bon est dans « Mes bons », plus bas.</Aide>
        </>
      ) : (
        <>
          <Bouton
            titre={
              offre.gainPossible > 0 ? `Ouvrir l'offre · +${offre.gainPossible}` : "Ouvrir l'offre"
            }
            onPress={onOuvrir}
            charge={enCours}
          />
          <Aide>
            {offre.gainPossible > 0
              ? `Le commerçant te verse ${jetons(offre.gainPossible)} si c'est ta première ouverture et que tu es passé chez un partenaire récemment.`
              : 'Ouvrir cette offre te donne le bon de réduction.'}
          </Aide>
        </>
      )}
    </Carte>
  );
}

function CarteBon({ bon }: { bon: Bon }) {
  return (
    <Carte style={bon.valable ? styles.carte : { ...styles.carte, ...styles.carteEteinte }}>
      <ImageOffre id={bon.publiciteId} version={bon.photoVersion} />
      <Text style={styles.commerce}>{bon.commerce.toUpperCase()}</Text>
      <SousTitre>{bon.titre}</SousTitre>
      <Text style={styles.accroche}>{bon.offre}</Text>

      <View style={styles.badges}>
        {Boolean(bon.reduction) && <Badge texte={bon.reduction} ton="positif" />}
        {bon.utiliseLe ? (
          <Badge texte={`Utilisé le ${dateCourte(bon.utiliseLe)}`} />
        ) : bon.valable ? (
          <Badge texte={`À faire valoir jusqu'au ${dateCourte(bon.finLe)}`} ton="attention" />
        ) : (
          <Badge texte="Offre terminée" />
        )}
      </View>
    </Carte>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  recherche: { flexDirection: 'row', alignItems: 'center', gap: espaces.sm },
  champ: {
    flex: 1,
    minWidth: 0,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.trait,
    borderRadius: rayons.md,
    paddingHorizontal: espaces.lg,
    paddingVertical: 12,
    color: couleurs.encre,
    fontSize: 15,
  },

  carte: { gap: espaces.sm },
  carteEteinte: { opacity: 0.6 },
  image: {
    width: '100%',
    // Une hauteur fixe pour que deux offres s'alignent, quelle que soit la
    // photo envoyée par le commerçant.
    height: 150,
    borderRadius: rayons.sm,
    backgroundColor: couleurs.nuit,
  },
  commerce: { ...typo.minuscule, color: couleurs.encreFaible, letterSpacing: 0.8 },
  accroche: { ...typo.corps, color: couleurs.encre, lineHeight: 22 },
  description: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 20 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.sm },
});
