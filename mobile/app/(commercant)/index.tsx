/**
 * Scanner le code d'un client.
 *
 * C'est le geste du quotidien : le client arrive, montre son écran, le
 * commerçant vise, et c'est fait. Tout le reste de l'écran existe pour les
 * fois où ça ne marche pas — parce que ça arrivera, avec un écran sale, une
 * caméra refusée, ou une vitrine en plein soleil.
 *
 * D'où la saisie des huit caractères, toujours visible sous la caméra. Le
 * code est fait pour ça : ni I, ni L, ni O, ni 0, ni 1, pour qu'on puisse le
 * dicter et le taper sans se tromper.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler, urlPhoto } from '../../src/api/client';
import { useMonCommerce } from '../../src/api/commerce';
import { Aide, Badge, Bouton, Carte, Erreur, SousTitre, Titre } from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface Resultat {
  joueur: { id: string; pseudo: string; photoVersion: number | null };
  premiereVisite: boolean;
  visites: number;
}

export default function Scanner() {
  const { commerce, chargement, erreur: erreurCommerce } = useMonCommerce();
  const [permission, demanderPermission] = useCameraPermissions();
  const [camera, setCamera] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [resultat, setResultat] = useState<Resultat | null>(null);
  // La caméra rappelle en boucle tant que le code reste dans le cadre. Sans
  // ce verrou, un seul code partirait dix fois au serveur, et le commerçant
  // verrait « ce code a déjà servi » juste après avoir réussi son scan.
  const enVol = useRef(false);

  const envoyer = useCallback(
    async (code: string) => {
      if (!commerce || enVol.current) return;
      enVol.current = true;
      setEnCours(true);
      setErreur('');
      try {
        setResultat(await appeler<Resultat>(`/businesses/${commerce.id}/presence`, {
          methode: 'POST',
          corps: { code },
        }));
        setSaisie('');
        setCamera(false);
      } catch (e) {
        setErreur((e as Error).message);
      } finally {
        setEnCours(false);
        enVol.current = false;
      }
    },
    [commerce?.id],
  );

  async function allumer() {
    setErreur('');
    if (!permission?.granted) {
      const reponse = await demanderPermission();
      if (!reponse.granted) {
        setErreur(
          "L'appareil photo est refusé. Tu peux l'autoriser dans les réglages du téléphone — ou taper les huit caractères ci-dessous.",
        );
        return;
      }
    }
    setResultat(null);
    setCamera(true);
  }

  if (chargement) {
    return (
      <SafeAreaView style={styles.ecran} edges={['top']}>
        <ScrollView contentContainerStyle={styles.contenu}>
          <Titre>Scanner</Titre>
          <Aide>Chargement…</Aide>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!commerce) {
    return (
      <SafeAreaView style={styles.ecran} edges={['top']}>
        <ScrollView contentContainerStyle={styles.contenu}>
          <Titre>Scanner</Titre>
          <Carte>
            <Erreur>{erreurCommerce}</Erreur>
            <Aide>
              Crée d'abord la fiche de ton établissement depuis l'espace commerçant du site. Il
              faut sa position exacte, et c'est plus simple à faire une fois, assis.
            </Aide>
          </Carte>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Titre>Scanner</Titre>
        <Aide>
          {commerce.nom} — le client ouvre « Mon code » sur son téléphone, tu vises, et sa venue
          est enregistrée.
        </Aide>

        {camera ? (
          <Carte style={styles.carteCamera}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => envoyer(data)}
            />
            <Bouton titre="Arrêter le scan" variante="discret" onPress={() => setCamera(false)} />
          </Carte>
        ) : (
          <Bouton titre="Scanner un QR code" onPress={allumer} charge={enCours} />
        )}

        <Erreur>{erreur}</Erreur>

        {resultat && (
          <Carte style={styles.resultat}>
            <View style={styles.ligneJoueur}>
              <PastilleJoueur joueur={resultat.joueur} />
              <View style={styles.texteJoueur}>
                <SousTitre>{resultat.joueur.pseudo}</SousTitre>
                <Text style={styles.detail}>
                  {resultat.premiereVisite
                    ? 'Première venue chez toi. Son quartier vient de se lever sur sa carte.'
                    : `${resultat.visites}ᵉ venue chez toi.`}
                </Text>
              </View>
            </View>
            <Badge texte="Venue enregistrée" ton="positif" />
          </Carte>
        )}

        <Carte>
          <SousTitre>…ou tape son code</SousTitre>
          <Aide>
            Les huit caractères affichés sous son QR. Ils ne contiennent jamais de I, L, O, 0 ni 1.
          </Aide>
          <TextInput
            style={styles.champ}
            value={saisie}
            onChangeText={setSaisie}
            onSubmitEditing={() => envoyer(saisie)}
            placeholder="Ex : ABCD EFGH"
            placeholderTextColor={couleurs.encreFaible}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="done"
          />
          <Bouton titre="Enregistrer la venue" onPress={() => envoyer(saisie)} charge={enCours} />
        </Carte>
      </ScrollView>
    </SafeAreaView>
  );
}

function PastilleJoueur({ joueur }: { joueur: Resultat['joueur'] }) {
  const photo = urlPhoto('joueur', joueur.id, joueur.photoVersion);
  return (
    <View style={styles.pastille}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.pastilleImage} />
      ) : (
        <Text style={styles.pastilleTexte}>
          {joueur.pseudo.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  carteCamera: { gap: espaces.md },
  camera: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: rayons.md,
    // Fond noir le temps que la caméra démarre : un cadre clair et vide
    // ferait croire à une image cassée.
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  resultat: {
    gap: espaces.md,
    backgroundColor: couleurs.positifDoux,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  ligneJoueur: { flexDirection: 'row', alignItems: 'center', gap: espaces.md },
  texteJoueur: { flex: 1, gap: 2 },
  detail: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 19 },

  pastille: {
    width: 44,
    height: 44,
    borderRadius: rayons.plein,
    backgroundColor: couleurs.haut,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pastilleImage: { width: 44, height: 44 },
  pastilleTexte: { ...typo.petit, fontWeight: '700', color: couleurs.encre },

  champ: {
    backgroundColor: couleurs.nuit,
    borderWidth: 1,
    borderColor: couleurs.trait,
    borderRadius: rayons.md,
    paddingHorizontal: espaces.lg,
    paddingVertical: 12,
    color: couleurs.encre,
    fontSize: 18,
    letterSpacing: 3,
  },
});
