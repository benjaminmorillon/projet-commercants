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
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler } from '../../src/api/client';
import { useSession } from '../../src/api/session';
import { Aide, Bouton, Carte, Erreur, Halo, Signature, SousTitre, Titre } from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface Commerce {
  businessId: string;
  nom: string;
  premiereVisite: string;
  derniereVisite: string;
  visites: number;
  retire: boolean;
}

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
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);

  const afficher = useCallback((recu: MonCode) => {
    setCode(recu);
    setRestantes(recu.secondesRestantes);
    setErreur('');
  }, []);

  const chargerCommerces = useCallback(async () => {
    if (!utilisateur) return;
    setCommerces(await appeler<Commerce[]>('/presence/mes-commerces').catch(() => []));
  }, [utilisateur?.id]);

  const charger = useCallback(async () => {
    if (!utilisateur) return;
    try {
      afficher(await appeler<MonCode>('/presence/mon-code'));
      await chargerCommerces();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [utilisateur?.id, afficher, chargerCommerces]);

  async function changerRetrait(commerce: Commerce) {
    await appeler(`/presence/mes-commerces/${commerce.businessId}/retrait`, {
      methode: 'POST',
      corps: { retire: !commerce.retire },
    });
    await chargerCommerces();
  }

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
      <Halo nom="code" />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Signature nom="code" />
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
            compte chez lui. Tu peux en sortir quand tu veux, juste en dessous.
          </Aide>
        </Carte>

        {commerces.length > 0 && (
          <Carte>
            <SousTitre>Les commerces qui me connaissent</SousTitre>
            <Aide>
              Tant que tu figures dans leur liste, ils peuvent t'envoyer leurs offres. En sortir
              ne t'enlève rien : tes venues, ton XP et tes quartiers levés restent à toi.
            </Aide>

            {commerces.map((commerce) => (
              <View
                key={commerce.businessId}
                style={[styles.commerce, commerce.retire && styles.commerceRetire]}
              >
                <View style={styles.commerceTexte}>
                  <Text style={styles.commerceNom}>{commerce.nom}</Text>
                  <Text style={styles.commerceDetail}>
                    {commerce.visites} venue{commerce.visites > 1 ? 's' : ''}
                    {commerce.retire ? ' · tu ne figures plus dans sa liste' : ''}
                  </Text>
                </View>
                <Pressable onPress={() => changerRetrait(commerce)}>
                  <Text style={styles.commerceAction}>
                    {commerce.retire ? 'Y revenir' : 'Ne plus recevoir ses offres'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </Carte>
        )}
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

  commerce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.md,
    paddingVertical: espaces.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.trait,
  },
  commerceRetire: { opacity: 0.6 },
  commerceTexte: { flex: 1, gap: 2 },
  commerceNom: { fontSize: 14.5, fontWeight: '600', color: couleurs.encre },
  commerceDetail: { ...typo.petit, color: couleurs.encreFaible },
  commerceAction: { ...typo.petit, fontWeight: '600', color: couleurs.accentEncre, textAlign: 'right' },
});
