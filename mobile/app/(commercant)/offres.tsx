/**
 * Les offres du commerçant, sur son téléphone.
 *
 * Deux gestes différents, et c'est pour ça qu'ils ne se ressemblent pas à
 * l'écran :
 *
 *  - SUIVRE ses offres en cours (combien de lectures, combien de bons
 *    encaissés, combien de budget il reste) et prévenir ses clients. Ça se
 *    fait debout, en dix secondes ;
 *  - EN PUBLIER une nouvelle. Ça se fait assis, et le formulaire est long.
 *    Il est donc replié par défaut.
 *
 * L'image de l'offre ne se met pas ici : choisir une photo demande d'ouvrir
 * la galerie du téléphone, ce qui n'a pas pu être essayé faute d'appareil
 * dans l'environnement de développement. Plutôt que de livrer un bouton qui
 * pourrait ne rien faire, l'écran renvoie au site — et le dit.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler } from '../../src/api/client';
import { Commerce } from '../../src/api/commerce';
import { AvecMonCommerce } from '../../src/api/ecran-commercant';
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
import { couleurs, espaces, typo } from '../../src/design/theme';

interface Offre {
  id: string;
  titre: string;
  offre: string;
  active: boolean;
  enCours: boolean;
  debutLe: string;
  finLe: string;
  nombreOuvertures: number;
  nombrePayees: number;
  nombreBonsUtilises: number;
  budgetJetons: number;
  budgetRestant: number;
  annonce: { possible: boolean; libelle: string };
}

export default function Offres() {
  return <AvecMonCommerce titre="Offres" rendu={(c) => <Contenu commerce={c} />} />;
}

function Contenu({ commerce }: { commerce: Commerce }) {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [rechargement, setRechargement] = useState(false);
  const [formulaire, setFormulaire] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      setOffres(await appeler<Offre[]>(`/businesses/${commerce.id}/offres`));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [commerce.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function agir(offre: Offre, action: 'basculer' | 'annoncer') {
    setEnCours(offre.id);
    setErreur('');
    try {
      if (action === 'basculer') {
        await appeler(`/businesses/${commerce.id}/offres/${offre.id}`, {
          methode: 'PUT',
          corps: { active: !offre.active },
        });
      } else {
        await appeler(`/businesses/${commerce.id}/offres/${offre.id}/annoncer`, {
          methode: 'POST',
        });
      }
      await charger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(null);
    }
  }

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
          {commerce.nom} — {offres.length} offre{offres.length > 1 ? 's' : ''}
          {offres.filter((o) => o.enCours).length > 0
            ? `, dont ${offres.filter((o) => o.enCours).length} en cours.`
            : '.'}
        </Aide>

        <Erreur>{erreur}</Erreur>

        {offres.map((offre) => (
          <Carte key={offre.id} style={styles.offre}>
            <View style={styles.entete}>
              <SousTitre>{offre.titre}</SousTitre>
              <Badge
                texte={offre.enCours ? 'En cours' : offre.active ? 'Hors période' : 'Suspendue'}
                ton={offre.enCours ? 'positif' : undefined}
              />
            </View>

            <Text style={styles.accroche}>{offre.offre}</Text>

            <View style={styles.badges}>
              <Badge texte={`${offre.nombreOuvertures} lecture${offre.nombreOuvertures > 1 ? 's' : ''}`} />
              <Badge texte={`${offre.nombreBonsUtilises} encaissé${offre.nombreBonsUtilises > 1 ? 's' : ''}`} />
              <Badge texte={`Reste ${offre.budgetRestant} / ${offre.budgetJetons}`} />
            </View>

            <Bouton
              titre={offre.annonce.libelle}
              desactive={!offre.annonce.possible}
              charge={enCours === offre.id}
              onPress={() => agir(offre, 'annoncer')}
            />
            <Bouton
              titre={offre.active ? 'Suspendre' : 'Réactiver'}
              variante="discret"
              onPress={() => agir(offre, 'basculer')}
            />
          </Carte>
        ))}

        <Pressable onPress={() => setFormulaire((ouvert) => !ouvert)}>
          <Text style={styles.bascule}>
            {formulaire ? '− Fermer le formulaire' : '+ Publier une nouvelle offre'}
          </Text>
        </Pressable>

        {formulaire && (
          <FormulaireOffre
            commerce={commerce}
            onPublie={async () => {
              setFormulaire(false);
              await charger();
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Le formulaire de publication.
 *
 * La période ne se saisit pas en deux dates mais en NOMBRE DE JOURS. C'est
 * plus juste sur un téléphone — un sélecteur de date demande un module natif
 * de plus, et surtout un commerçant pense « pendant trois semaines », pas
 * « du 15 septembre au 6 octobre ». Le début, c'est aujourd'hui.
 */
function FormulaireOffre({
  commerce,
  onPublie,
}: {
  commerce: Commerce;
  onPublie: () => Promise<void>;
}) {
  const [titre, setTitre] = useState('');
  const [offre, setOffre] = useState('');
  const [description, setDescription] = useState('');
  const [motsCles, setMotsCles] = useState('');
  const [pourcent, setPourcent] = useState('');
  const [jours, setJours] = useState('30');
  const [budget, setBudget] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function publier() {
    setErreur('');
    setEnCours(true);
    try {
      const duree = Math.max(1, Number(jours) || 30);
      const aujourdhui = new Date();
      const fin = new Date(Date.now() + duree * 24 * 60 * 60 * 1000);
      const reduction = Number(pourcent);

      await appeler(`/businesses/${commerce.id}/offres`, {
        methode: 'POST',
        corps: {
          titre: titre.trim(),
          offre: offre.trim(),
          description: description.trim(),
          motsCles: motsCles.trim(),
          ...(reduction ? { reductionPourcent: Math.round(reduction) } : {}),
          debutLe: aujourdhui.toISOString().slice(0, 10),
          finLe: fin.toISOString().slice(0, 10),
          budgetJetons: Number(budget),
        },
      });
      await onPublie();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Carte>
      <SousTitre>Publier une offre</SousTitre>
      <Aide>
        Elle reste consultable pendant toute la durée que tu fixes, se retrouve quand un joueur
        cherche ce que tu vends, et lui sert de bon de réduction quand il vient payer.
      </Aide>

      <Champ etiquette="Titre" value={titre} onChangeText={setTitre} placeholder="Le menu du midi" />
      <Champ
        etiquette="L'offre en une phrase"
        value={offre}
        onChangeText={setOffre}
        placeholder="Entrée + plat + café à 14 €"
      />
      <Champ
        etiquette="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Ce que le joueur découvre en ouvrant l'offre."
        multiline
      />
      <Champ
        etiquette="Mots-clés"
        value={motsCles}
        onChangeText={setMotsCles}
        placeholder="pizza, italien, midi, à emporter"
        autoCapitalize="none"
      />
      <Aide>
        C'est par ces mots qu'on te trouvera. Écris ce qu'un client taperait, pas le nom de ton
        commerce.
      </Aide>

      <Champ
        etiquette="Réduction en % (facultatif)"
        value={pourcent}
        onChangeText={setPourcent}
        placeholder="10"
        keyboardType="number-pad"
      />
      <Champ
        etiquette="Pendant combien de jours ?"
        value={jours}
        onChangeText={setJours}
        placeholder="30"
        keyboardType="number-pad"
      />
      <Champ
        etiquette="Budget en jetons"
        value={budget}
        onChangeText={setBudget}
        placeholder="20"
        keyboardType="decimal-pad"
      />
      <Aide>
        Le budget paie les lectures : chaque fois qu'un joueur ouvre ton offre, une petite somme
        lui est versée depuis ce budget. Quand il est épuisé, l'offre s'arrête.
      </Aide>

      <Erreur>{erreur}</Erreur>

      <Bouton titre="Publier l'offre" onPress={publier} charge={enCours} />
      <Aide>Pour ajouter une image à l'offre, passe par l'espace commerçant du site.</Aide>
    </Carte>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  offre: { gap: espaces.sm },
  entete: { flexDirection: 'row', alignItems: 'center', gap: espaces.sm, flexWrap: 'wrap' },
  accroche: { ...typo.corps, color: couleurs.encre },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.sm },

  bascule: {
    ...typo.petit,
    fontWeight: '600',
    color: couleurs.accentEncre,
    paddingVertical: espaces.sm,
  },
});
