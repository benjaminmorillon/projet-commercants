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
import { Aide, Bouton, Carte, Champ, Erreur, SousTitre, Titre } from '../../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../../src/design/theme';

interface Jetons {
  solde: number;
}

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
  const [jetons, setJetons] = useState<Jetons | null>(null);
  const [montant, setMontant] = useState('');
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [rechargement, setRechargement] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    if (!commerce) return;
    setErreur('');
    try {
      const [sesClients, sonSolde] = await Promise.all([
        appeler<Client[]>(`/businesses/${commerce.id}/clients`),
        appeler<Jetons>(`/businesses/${commerce.id}/jetons`),
      ]);
      setClients(sesClients);
      setJetons(sonSolde);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [commerce?.id]);

  async function recharger() {
    if (!commerce) return;
    setErreur('');
    setMessage('');
    setEnCours(true);
    try {
      await appeler(`/businesses/${commerce.id}/jetons/recharger`, {
        methode: 'POST',
        corps: { montant: Number(montant) },
      });
      setMessage(`${montant} jetons crédités.`);
      setMontant('');
      await charger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

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
          <SousTitre>Mes jetons</SousTitre>
          <Text style={styles.solde}>{jetons?.solde ?? 0}</Text>
          <Aide>
            Les jetons paient les lectures de tes offres et les envois de ciblage. Sans solde, tes
            offres s'arrêtent. Valider une mission ne t'en coûte aucun : cette récompense-là est
            émise par la plateforme.
          </Aide>
          <Champ
            etiquette="Recharger"
            value={montant}
            onChangeText={setMontant}
            placeholder="20"
            keyboardType="decimal-pad"
          />
          {Boolean(message) && <Text style={styles.succes}>{message}</Text>}
          <Bouton titre="Créditer mon compte" onPress={recharger} charge={enCours} />
          <Aide>
            Le paiement est simulé tant qu'aucun prestataire n'est branché : le crédit est
            immédiat, et rien n'est débité.
          </Aide>
        </Carte>

        <Carte>
          <SousTitre>Mon compte</SousTitre>
          <Aide>
            Connecté en tant que {utilisateur?.pseudo}. Les événements, le ciblage et la carte de
            la concurrence se gèrent depuis l'espace commerçant du site.
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

  solde: { fontSize: 34, fontWeight: '700', color: couleurs.accentEncre },
  succes: { ...typo.petit, color: couleurs.positif },
});
