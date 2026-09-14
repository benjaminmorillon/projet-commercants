/**
 * La racine de l'application.
 *
 * Elle ne fait qu'une chose : décider où l'on atterrit. Tant qu'on ne sait
 * pas si quelqu'un est connecté, on n'affiche rien plutôt que de faire
 * clignoter l'écran de connexion devant quelqu'un qui l'est déjà.
 */
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FournisseurDeSession, useSession } from '../src/api/session';
import { couleurs } from '../src/design/theme';

function Aiguillage() {
  const { utilisateur, chargement } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (chargement) return;

    const dansLApplication = segments[0] === '(onglets)';

    if (!utilisateur && dansLApplication) {
      router.replace('/connexion');
    } else if (utilisateur && !dansLApplication) {
      router.replace('/(onglets)');
    }
  }, [utilisateur, chargement, segments]);

  if (chargement) {
    return (
      <View style={styles.attente}>
        <ActivityIndicator color={couleurs.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
        animation: 'fade',
      }}
    />
  );
}

export default function Racine() {
  return (
    <SafeAreaProvider>
      {/* La barre d'état du téléphone en clair : le fond est sombre. */}
      <StatusBar style="light" />
      <FournisseurDeSession>
        <Aiguillage />
      </FournisseurDeSession>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  attente: {
    flex: 1,
    backgroundColor: couleurs.fond,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
