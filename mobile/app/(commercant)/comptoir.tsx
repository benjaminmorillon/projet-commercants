/**
 * Le comptoir : ce qui attend une réponse de toi, maintenant.
 *
 * Deux choses, et elles arrivent de la même façon — quelqu'un est devant
 * toi et demande quelque chose :
 *
 *  - une MISSION à valider : un joueur dit l'avoir accomplie chez toi, et
 *    rien ne lui est versé tant que tu n'as pas confirmé ;
 *  - un BON à encaisser : il a ouvert ton offre, il a droit à la réduction,
 *    il te montre son bon au moment de payer.
 *
 * Elles étaient jusqu'ici dans deux onglets différents du site. Sur un
 * téléphone, derrière un comptoir, c'est le même geste : je regarde ce qu'on
 * me demande, et je réponds.
 */
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler } from '../../src/api/client';
import { Commerce } from '../../src/api/commerce';
import { AvecMonCommerce } from '../../src/api/ecran-commercant';
import { Aide, Badge, Bouton, Carte, Erreur, SousTitre, Titre } from '../../src/design/composants';
import { couleurs, espaces, typo } from '../../src/design/theme';

interface Validation {
  id: string;
  missionTitre: string;
  missionRecompense: number;
  requesterPseudo: string;
  createdAt: string;
}

interface Bon {
  id: string;
  titre: string;
  offre: string;
  reduction: string;
  joueur: string;
  obtenuLe: string;
  utiliseLe: string | null;
  valable: boolean;
}

export default function Comptoir() {
  return <AvecMonCommerce titre="Comptoir" rendu={(c) => <Contenu commerce={c} />} />;
}

function Contenu({ commerce }: { commerce: Commerce }) {
  const [validations, setValidations] = useState<Validation[]>([]);
  const [bons, setBons] = useState<Bon[]>([]);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [rechargement, setRechargement] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const [aValider, sesBons] = await Promise.all([
        appeler<Validation[]>(`/businesses/${commerce.id}/validations`),
        appeler<Bon[]>(`/businesses/${commerce.id}/bons`),
      ]);
      setValidations(aValider);
      setBons(sesBons);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [commerce.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function trancher(validation: Validation, accepte: boolean) {
    setEnCours(validation.id);
    setErreur('');
    try {
      await appeler(`/validations/${validation.id}/${accepte ? 'valider' : 'refuser'}`, {
        methode: 'POST',
      });
      await charger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(null);
    }
  }

  async function encaisser(bon: Bon) {
    setEnCours(bon.id);
    setErreur('');
    try {
      await appeler(`/businesses/${commerce.id}/bons/${bon.id}/utiliser`, { methode: 'POST' });
      await charger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(null);
    }
  }

  // Les bons à encaisser d'abord : c'est la seule chose qu'on cherche ici
  // quand quelqu'un attend devant la caisse.
  const aEncaisser = bons.filter((b) => b.valable);
  const passes = bons.filter((b) => !b.valable);

  const attente = validations.length + aEncaisser.length;

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
        <Titre>Comptoir</Titre>
        <Aide>
          {attente === 0
            ? `${commerce.nom} — rien ne t’attend pour l’instant.`
            : `${commerce.nom} — ${attente} chose${attente > 1 ? 's' : ''} à traiter.`}
        </Aide>

        <Erreur>{erreur}</Erreur>

        <Carte>
          <SousTitre>Missions à valider ({validations.length})</SousTitre>
          {validations.length === 0 ? (
            <Aide>
              Personne n'attend de confirmation. Quand un joueur dira avoir accompli une mission
              chez toi, elle apparaîtra ici — et rien ne lui sera versé avant ta réponse.
            </Aide>
          ) : (
            validations.map((validation) => (
              <View key={validation.id} style={styles.ligne}>
                <View style={styles.texte}>
                  <Text style={styles.nom}>{validation.requesterPseudo}</Text>
                  <Text style={styles.detail}>
                    {validation.missionTitre} · +{validation.missionRecompense}
                  </Text>
                </View>
                <View style={styles.reponses}>
                  <Bouton
                    titre="Valider"
                    charge={enCours === validation.id}
                    onPress={() => trancher(validation, true)}
                  />
                  <Bouton
                    titre="Refuser"
                    variante="discret"
                    onPress={() => trancher(validation, false)}
                  />
                </View>
              </View>
            ))
          )}
        </Carte>

        <Carte>
          <SousTitre>Bons à encaisser ({aEncaisser.length})</SousTitre>
          {aEncaisser.length === 0 ? (
            <Aide>Aucun bon en attente. Ils arrivent quand un client ouvre une de tes offres.</Aide>
          ) : (
            aEncaisser.map((bon) => (
              <View key={bon.id} style={styles.ligne}>
                <View style={styles.texte}>
                  <Text style={styles.nom}>{bon.joueur}</Text>
                  <Text style={styles.detail}>
                    {bon.titre} — {bon.offre}
                  </Text>
                  {Boolean(bon.reduction) && <Badge texte={bon.reduction} ton="positif" />}
                </View>
                <Bouton
                  titre="Encaisser"
                  charge={enCours === bon.id}
                  onPress={() => encaisser(bon)}
                />
              </View>
            ))
          )}
          <Aide>Un bon ne peut être encaissé qu'une fois.</Aide>
        </Carte>

        {passes.length > 0 && (
          <Carte>
            <SousTitre>Bons déjà passés ({passes.length})</SousTitre>
            {passes.slice(0, 10).map((bon) => (
              <View key={bon.id} style={styles.ligne}>
                <View style={styles.texte}>
                  <Text style={styles.nomPasse}>{bon.joueur}</Text>
                  <Text style={styles.detail}>
                    {bon.utiliseLe ? `Encaissé le ${dateCourte(bon.utiliseLe)}` : 'Offre terminée'}
                  </Text>
                </View>
              </View>
            ))}
          </Carte>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function dateCourte(valeur: string): string {
  return new Date(valeur).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  ligne: {
    gap: espaces.sm,
    paddingVertical: espaces.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.trait,
  },
  texte: { gap: 4 },
  nom: { fontSize: 14.5, fontWeight: '600', color: couleurs.encre },
  nomPasse: { fontSize: 14.5, fontWeight: '600', color: couleurs.encreDouce },
  detail: { ...typo.petit, color: couleurs.encreFaible },
  reponses: { gap: espaces.sm },
});
