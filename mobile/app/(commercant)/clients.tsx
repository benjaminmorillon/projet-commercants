/**
 * Les clients du commerce.
 *
 * Ceux qui sont réellement passés, code scanné à l'appui — et qui n'ont pas
 * demandé à sortir de la liste. C'est la carte de fidélité que le commerçant
 * n'avait pas, et que le client n'a pas eu à demander.
 *
 * Les plus fidèles en tête : ce sont eux qu'on veut reconnaître quand ils
 * poussent la porte.
 */
import { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appeler, urlPhoto } from '../../src/api/client';
import { useMonCommerce } from '../../src/api/commerce';
import { useSession } from '../../src/api/session';
import { Aide, Bouton, Carte, Erreur, SousTitre, Titre } from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface Client {
  playerId: string;
  pseudo: string;
  photoVersion: number | null;
  premiereVisite: string;
  derniereVisite: string;
  visites: number;
}

export default function Clients() {
  const { commerce, erreur: erreurCommerce } = useMonCommerce();
  const { utilisateur, deconnecter } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [rechargement, setRechargement] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    if (!commerce) return;
    setErreur('');
    try {
      setClients(await appeler<Client[]>(`/businesses/${commerce.id}/clients`));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [commerce?.id]);

  useEffect(() => {
    charger();
  }, [charger]);

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
        <Titre>Clients</Titre>
        {commerce && (
          <Aide>
            {commerce.nom} — {clients.length} personne{clients.length > 1 ? 's' : ''}
            {clients.length > 1 ? ' sont passées' : ' est passée'} chez toi.
          </Aide>
        )}

        <Erreur>{erreur || erreurCommerce}</Erreur>

        {clients.length === 0 && commerce && !erreur && (
          <Carte>
            <Aide>
              Personne n'a encore fait scanner son code chez toi. Ça commence au premier client qui
              te montre son écran.
            </Aide>
          </Carte>
        )}

        {clients.map((client) => (
          <Carte key={client.playerId} style={styles.client}>
            <Pastille client={client} />
            <View style={styles.texte}>
              <Text style={styles.nom}>{client.pseudo}</Text>
              <Text style={styles.detail}>
                Depuis le {dateCourte(client.premiereVisite)} · dernière venue le{' '}
                {dateCourte(client.derniereVisite)}
              </Text>
            </View>
            <Text style={styles.visites}>
              {client.visites} venue{client.visites > 1 ? 's' : ''}
            </Text>
          </Carte>
        ))}

        <Carte>
          <SousTitre>Mon compte</SousTitre>
          <Aide>
            Connecté en tant que {utilisateur?.pseudo}. Les offres, les événements et le ciblage
            se gèrent depuis l'espace commerçant du site.
          </Aide>
          <Bouton titre="Se déconnecter" variante="discret" onPress={deconnecter} />
        </Carte>
      </ScrollView>
    </SafeAreaView>
  );
}

function dateCourte(valeur: string): string {
  return new Date(valeur).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function Pastille({ client }: { client: Client }) {
  const photo = urlPhoto('joueur', client.playerId, client.photoVersion);
  return (
    <View style={styles.pastille}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.pastilleImage} />
      ) : (
        <Text style={styles.pastilleTexte}>{client.pseudo.slice(0, 2).toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },

  client: { flexDirection: 'row', alignItems: 'center', gap: espaces.md },
  texte: { flex: 1, gap: 2 },
  nom: { fontSize: 14.5, fontWeight: '600', color: couleurs.encre },
  detail: { ...typo.petit, color: couleurs.encreFaible },
  visites: { ...typo.petit, fontWeight: '600', color: couleurs.accentEncre },

  pastille: {
    width: 40,
    height: 40,
    borderRadius: rayons.plein,
    backgroundColor: couleurs.haut,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pastilleImage: { width: 40, height: 40 },
  pastilleTexte: { ...typo.petit, fontWeight: '700', color: couleurs.encre },
});
