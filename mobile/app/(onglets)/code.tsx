/**
 * Mon code de présence.
 *
 * Un QR, les huit caractères écrits en dessous, et un compte à rebours.
 *
 * Le compte à rebours n'est pas décoratif : le code meurt au bout de deux
 * minutes, et sans lui le joueur tendrait son téléphone à un commerçant qui
 * lirait un code déjà mort, sans que ni l'un ni l'autre comprenne pourquoi
 * ça ne marche pas.
 *
 * L'écran se rafraîchit en revenant dessus : on y arrive typiquement en
 * poussant la porte du commerce, après l'avoir laissé ouvert dans la poche.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler } from '../../src/api/client';
import { useSession } from '../../src/api/session';
import { Aide, Bouton, Carte, Erreur, SousTitre, Titre } from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface MonCode {
  code: string;
  lisible: string;
  expireLe: string;
  secondesRestantes: number;
  /** Le QR, en image, directement dans la réponse. */
  qr: string;
}

export default function Code() {
  const { utilisateur } = useSession();
  const [code, setCode] = useState<MonCode | null>(null);
  const [restantes, setRestantes] = useState(0);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);

  const afficher = useCallback((recu: MonCode) => {
    setCode(recu);
    setRestantes(recu.secondesRestantes);
    setErreur('');
  }, []);

  const charger = useCallback(async () => {
    if (!utilisateur) return;
    try {
      afficher(await appeler<MonCode>('/presence/mon-code'));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [utilisateur?.id, afficher]);

  // À chaque fois qu'on revient sur l'onglet : le code affiché a pu mourir
  // pendant que le téléphone était dans la poche.
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  useEffect(() => {
    minuteur.current = setInterval(() => setRestantes((s) => Math.max(0, s - 1)), 1000);
    return () => {
      if (minuteur.current) clearInterval(minuteur.current);
    };
  }, []);

  async function renouveler() {
    setEnCours(true);
    try {
      afficher(await appeler<MonCode>('/presence/mon-code/renouveler', { methode: 'POST' }));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  const minutes = Math.floor(restantes / 60);
  const secondes = String(restantes % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Titre>Mon code</Titre>
        <Aide>
          Montre-le au commerçant : c'est ce qui enregistre ta venue et lève son quartier sur ta
          carte.
        </Aide>

        <Erreur>{erreur}</Erreur>

        <Carte style={styles.carteCode}>
          {/* Le QR est le seul élément blanc de l'application, et c'est
              voulu : une caméra a besoin d'un fond franc pour l'accrocher. */}
          <View style={styles.cadre}>
            {code ? (
              <Image source={{ uri: code.qr }} style={styles.qr} resizeMode="contain" />
            ) : (
              <View style={styles.qr} />
            )}
          </View>

          <Text style={styles.codeLisible}>{code?.lisible ?? '········'}</Text>
          <Aide>
            Si la caméra du commerçant ne veut rien savoir, il peut taper ces huit caractères.
          </Aide>

          <Text style={[styles.rebours, restantes === 0 && styles.reboursExpire]}>
            {restantes > 0 ? `Valable encore ${minutes}:${secondes}` : 'Ce code a expiré.'}
          </Text>

          <Bouton titre="Afficher un nouveau code" onPress={renouveler} charge={enCours} />
        </Carte>

        <Carte>
          <SousTitre>Comment ça marche</SousTitre>
          <Text style={styles.etape}>1. Tu entres dans le commerce et tu ouvres cet écran.</Text>
          <Text style={styles.etape}>
            2. Le commerçant scanne ton code — ou tape les huit caractères.
          </Text>
          <Text style={styles.etape}>
            3. Ta venue est enregistrée : XP, quartier levé sur la carte, et tu peux laisser un
            avis.
          </Text>
          <Aide>
            Un code ne vaut qu'une fois, et quelques minutes. Une capture d'écran envoyée à
            quelqu'un ne lui sert à rien — c'est justement ce qui garantit que seuls les gens
            réellement passés comptent.
          </Aide>
          <Aide>
            En te faisant scanner, tu entres dans la liste des clients de ce commerce : il pourra
            t'adresser ses offres, comme une carte de fidélité — sans que tu aies eu à créer de
            compte chez lui.
          </Aide>
        </Carte>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  carteCode: { alignItems: 'center', gap: espaces.md },
  cadre: { backgroundColor: '#ffffff', borderRadius: rayons.md, padding: espaces.md },
  qr: { width: 220, height: 220 },

  // Gros et espacés : ils doivent pouvoir être lus à l'envers, par-dessus un
  // comptoir.
  codeLisible: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 6,
    color: couleurs.encre,
  },
  rebours: { ...typo.petit, color: couleurs.encreDouce },
  reboursExpire: { color: couleurs.attention, fontWeight: '600' },

  etape: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 20 },
});
