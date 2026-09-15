/**
 * Le cadre commun des écrans du commerçant.
 *
 * Les quatre écrans commencent tous pareil : trouver l'établissement,
 * attendre, et dire quoi faire quand le compte n'en a pas encore. Écrit une
 * fois ici plutôt que recopié quatre fois — sinon le message « crée d'abord
 * ta fiche » finirait par exister en quatre versions légèrement différentes.
 *
 * Une fois l'établissement connu, le rendu passe la main : chaque écran a ses
 * propres chargements, sa propre liste à tirer pour rafraîchir. Le cadre ne
 * s'en mêle pas — il répond seulement à la question « y a-t-il un commerce ? ».
 */
import { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aide, Carte, Erreur, Titre } from '../design/composants';
import { couleurs, espaces } from '../design/theme';
import { Commerce, useMonCommerce } from './commerce';

export function AvecMonCommerce({
  titre,
  rendu,
}: {
  titre: string;
  rendu: (commerce: Commerce) => ReactNode;
}) {
  const { commerce, chargement, erreur } = useMonCommerce();

  if (commerce) {
    return <>{rendu(commerce)}</>;
  }

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Titre>{titre}</Titre>

        {chargement ? (
          <Aide>Chargement…</Aide>
        ) : (
          <Carte>
            <Erreur>{erreur}</Erreur>
            <Aide>
              Crée d'abord la fiche de ton établissement depuis l'espace commerçant du site. Il
              faut sa position exacte, et c'est plus simple à faire une fois, assis.
            </Aide>
          </Carte>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.lg, gap: espaces.md, paddingBottom: espaces.xxl },
});
