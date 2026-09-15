/**
 * Les amis.
 *
 * Trois choses, dans cet ordre : ce qu'on attend de moi (les demandes
 * reçues), qui je connais déjà, et comment en ajouter.
 *
 * Les demandes en premier parce qu'elles sont la seule chose qui demande une
 * décision : laisser quelqu'un attendre parce que sa demande était trois
 * écrans plus bas serait le meilleur moyen de tuer le lien qu'on cherche
 * justement à créer.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler, urlPhoto } from '../../src/api/client';
import { useSession } from '../../src/api/session';
import {
  Aide,
  Bouton,
  Carte,
  Champ,
  Erreur,
  SousTitre,
  Titre,
  initialesDe,
  teinteDe,
} from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface Ami {
  id: string;
  pseudo: string;
  photoVersion: number | null;
}

interface Demande {
  id: string;
  otherId: string;
  otherPseudo: string;
  otherPhotoVersion: number | null;
  createdAt: string;
}

export default function Amis() {
  const { utilisateur } = useSession();
  const [amis, setAmis] = useState<Ami[]>([]);
  const [recues, setRecues] = useState<Demande[]>([]);
  const [envoyees, setEnvoyees] = useState<Demande[]>([]);
  const [pseudo, setPseudo] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [rechargement, setRechargement] = useState(false);

  const charger = useCallback(async () => {
    if (!utilisateur) return;
    setErreur('');
    try {
      const [mesAmis, mesRecues, mesEnvoyees] = await Promise.all([
        appeler<Ami[]>(`/players/${utilisateur.id}/friends`),
        appeler<Demande[]>(`/players/${utilisateur.id}/friends/requests`),
        appeler<Demande[]>(`/players/${utilisateur.id}/friends/sent`),
      ]);
      setAmis(mesAmis);
      setRecues(mesRecues);
      setEnvoyees(mesEnvoyees);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [utilisateur?.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function repondre(demande: Demande, accepte: boolean) {
    setErreur('');
    try {
      await appeler(`/friends/${demande.id}/${accepte ? 'accept' : 'refuse'}`, {
        methode: 'POST',
      });
      await charger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  async function demander() {
    if (!utilisateur) return;
    setErreur('');
    setMessage('');
    setEnCours(true);
    try {
      await appeler(`/players/${utilisateur.id}/friends/request`, {
        methode: 'POST',
        corps: { pseudo: pseudo.trim() },
      });
      setMessage(`Demande envoyée à ${pseudo.trim()}.`);
      setPseudo('');
      await charger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
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
        <Retour />
        <Titre>Amis</Titre>

        <Erreur>{erreur}</Erreur>

        {recues.length > 0 && (
          <Carte>
            <SousTitre>On te demande en ami</SousTitre>
            {recues.map((demande) => (
              <View key={demande.id} style={styles.demande}>
                <Pastille nom={demande.otherPseudo} id={demande.otherId} version={demande.otherPhotoVersion} />
                <Text style={styles.nom}>{demande.otherPseudo}</Text>
                <View style={styles.reponses}>
                  <Pressable onPress={() => repondre(demande, true)}>
                    <Text style={styles.accepter}>Accepter</Text>
                  </Pressable>
                  <Pressable onPress={() => repondre(demande, false)}>
                    <Text style={styles.refuser}>Refuser</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Carte>
        )}

        <Carte>
          <SousTitre>Mes amis ({amis.length})</SousTitre>
          {amis.length === 0 ? (
            <Aide>
              Personne pour l'instant. Les gens que tu croises en mission sont les plus faciles à
              ajouter : tu connais déjà leur pseudo.
            </Aide>
          ) : (
            amis.map((ami) => (
              <View key={ami.id} style={styles.demande}>
                <Pastille nom={ami.pseudo} id={ami.id} version={ami.photoVersion} />
                <Text style={styles.nom}>{ami.pseudo}</Text>
              </View>
            ))
          )}
        </Carte>

        <Carte>
          <SousTitre>Ajouter quelqu'un</SousTitre>
          <Aide>Son pseudo exact, tel qu'il l'a choisi.</Aide>
          <Champ
            etiquette="Pseudo"
            value={pseudo}
            onChangeText={setPseudo}
            placeholder="Ex : Alex"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {Boolean(message) && <Text style={styles.succes}>{message}</Text>}
          <Bouton titre="Envoyer la demande" onPress={demander} charge={enCours} />
        </Carte>

        {envoyees.length > 0 && (
          <Carte>
            <SousTitre>Demandes envoyées</SousTitre>
            <Aide>En attente de leur réponse.</Aide>
            {envoyees.map((demande) => (
              <View key={demande.id} style={styles.demande}>
                <Pastille nom={demande.otherPseudo} id={demande.otherId} version={demande.otherPhotoVersion} />
                <Text style={styles.nom}>{demande.otherPseudo}</Text>
              </View>
            ))}
          </Carte>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Retour() {
  return (
    <Pressable onPress={() => router.back()} style={styles.retour}>
      <Text style={styles.retourTexte}>‹ Retour</Text>
    </Pressable>
  );
}

function Pastille({
  nom,
  id,
  version,
}: {
  nom: string;
  id: string;
  version: number | null;
}) {
  const teinte = teinteDe(nom);
  const photo = urlPhoto('joueur', id, version);

  return (
    <View style={[styles.pastille, { backgroundColor: teinte.fond }]}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.pastilleImage} />
      ) : (
        <Text style={[styles.pastilleTexte, { color: teinte.encre }]}>{initialesDe(nom)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  retour: { paddingVertical: espaces.xs },
  retourTexte: { ...typo.petit, fontWeight: '600', color: couleurs.accentEncre },

  demande: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.md,
    paddingVertical: espaces.sm,
  },
  nom: { flex: 1, fontSize: 14.5, fontWeight: '600', color: couleurs.encre },
  reponses: { flexDirection: 'row', gap: espaces.lg },
  accepter: { ...typo.petit, fontWeight: '700', color: couleurs.positif },
  refuser: { ...typo.petit, fontWeight: '600', color: couleurs.encreFaible },
  succes: { ...typo.petit, color: couleurs.positif },

  pastille: {
    width: 40,
    height: 40,
    borderRadius: rayons.plein,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pastilleImage: { width: 40, height: 40 },
  pastilleTexte: { ...typo.petit, fontWeight: '700' },
});
