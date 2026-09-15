/**
 * Connexion et inscription, dans un seul écran.
 *
 * Deux formulaires séparés obligeraient à naviguer pour corriger une erreur
 * de parcours (« je n'ai pas de compte », « j'en ai déjà un ») : une bascule
 * suffit, et garde ce qui a déjà été tapé.
 */
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/api/session';
import { Aide, Bouton, Carte, Champ, Erreur, Titre } from '../src/design/composants';
import { couleurs, espaces, rayons, typo } from '../src/design/theme';

type Mode = 'connexion' | 'inscription';

export default function Connexion() {
  const { connecter, inscrire } = useSession();
  const [mode, setMode] = useState<Mode>('connexion');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    setErreur('');
    setEnCours(true);
    try {
      if (mode === 'inscription') {
        await inscrire(pseudo.trim(), email.trim(), motDePasse);
      } else {
        await connecter(email.trim(), motDePasse);
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <SafeAreaView style={styles.ecran}>
      <KeyboardAvoidingView
        style={styles.ecran}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.contenu}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.entete}>
            <View style={styles.point} />
            <Text style={styles.marque}>Projet Commerçant</Text>
          </View>

          <Titre>Le quartier t'attend</Titre>
          <Aide>
            Des missions dans les commerces autour de toi, à faire seul ou à plusieurs.
          </Aide>

          <Carte style={styles.carte}>
            <View style={styles.bascule}>
              {(['connexion', 'inscription'] as Mode[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMode(m);
                    setErreur('');
                  }}
                  style={[styles.onglet, mode === m && styles.ongletActif]}
                >
                  <Text style={[styles.ongletTexte, mode === m && styles.ongletTexteActif]}>
                    {m === 'connexion' ? 'J’ai un compte' : 'Créer un compte'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === 'inscription' && (
              <Champ
                etiquette="Pseudo"
                value={pseudo}
                onChangeText={setPseudo}
                placeholder="Ex : Alex"
                autoCapitalize="words"
                maxLength={40}
              />
            )}

            <Champ
              etiquette="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="toi@exemple.fr"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Champ
              etiquette="Mot de passe"
              value={motDePasse}
              onChangeText={setMotDePasse}
              placeholder="8 caractères minimum"
              secureTextEntry
              autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
            />

            <Erreur>{erreur}</Erreur>

            <Bouton
              titre={mode === 'inscription' ? 'Créer mon compte' : 'Se connecter'}
              onPress={valider}
              charge={enCours}
            />

            <Aide>
              Ton mot de passe n'est jamais enregistré tel quel : le serveur n'en garde
              qu'une empreinte impossible à remonter.
            </Aide>

            {mode === 'connexion' && (
              <Aide>
                Commerçant ? Connecte-toi avec le compte de ton espace commerçant : tu arrives
                directement sur le scanner. La fiche de ton établissement, elle, se crée depuis
                le site.
              </Aide>
            )}
          </Carte>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: {
    padding: espaces.xl,
    gap: espaces.md,
    flexGrow: 1,
    justifyContent: 'center',
  },
  entete: { flexDirection: 'row', alignItems: 'center', gap: espaces.sm, marginBottom: espaces.lg },
  point: { width: 9, height: 9, borderRadius: 5, backgroundColor: couleurs.accent },
  marque: { ...typo.sousTitre, color: couleurs.encre },
  carte: { marginTop: espaces.lg },

  bascule: {
    flexDirection: 'row',
    backgroundColor: couleurs.nuit,
    borderRadius: rayons.plein,
    borderWidth: 1,
    borderColor: couleurs.trait,
    padding: 4,
    gap: 4,
    marginBottom: espaces.sm,
  },
  onglet: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: rayons.plein,
    alignItems: 'center',
  },
  ongletActif: { backgroundColor: couleurs.accent },
  ongletTexte: { fontSize: 13.5, fontWeight: '600', color: couleurs.encreDouce },
  ongletTexteActif: { color: couleurs.encreInverse },
});
