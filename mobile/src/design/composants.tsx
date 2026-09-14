/**
 * Les briques d'interface partagées.
 *
 * Elles reprennent une à une les règles de l'identité du site :
 *  - le bouton principal est violet et porte une lueur ;
 *  - un champ est CREUSÉ (plus sombre que la carte), un bouton est POSÉ ;
 *  - le vert, le rouge et l'orange ne servent qu'au sens.
 */
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { couleurs, espaces, lueurAccent, rayons, typo } from './theme';

// --- Carte -----------------------------------------------------------------

export function Carte({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.carte, style]}>{children}</View>;
}

// --- Titres ----------------------------------------------------------------

export function Titre({ children }: { children: ReactNode }) {
  return <Text style={styles.titre}>{children}</Text>;
}

export function SousTitre({ children }: { children: ReactNode }) {
  return <Text style={styles.sousTitre}>{children}</Text>;
}

export function Aide({ children }: { children: ReactNode }) {
  return <Text style={styles.aide}>{children}</Text>;
}

export function Erreur({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.erreur}>{children}</Text>;
}

// --- Bouton ----------------------------------------------------------------

interface BoutonProps {
  titre: string;
  onPress: () => void;
  variante?: 'principal' | 'discret';
  charge?: boolean;
  desactive?: boolean;
}

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  charge = false,
  desactive = false,
}: BoutonProps) {
  const principal = variante === 'principal';
  const inactif = desactive || charge;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactif}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.bouton,
        principal ? styles.boutonPrincipal : styles.boutonDiscret,
        // La lueur appartient au fond violet : un bouton discret ne l'a pas.
        principal && !inactif ? lueurAccent : null,
        inactif && styles.boutonInactif,
        pressed && !inactif && styles.boutonPresse,
      ]}
    >
      {charge ? (
        <ActivityIndicator color={principal ? couleurs.encreInverse : couleurs.encre} />
      ) : (
        <Text
          style={[
            styles.boutonTexte,
            principal ? styles.boutonTextePrincipal : styles.boutonTexteDiscret,
            inactif && styles.boutonTexteInactif,
          ]}
        >
          {titre}
        </Text>
      )}
    </Pressable>
  );
}

// --- Champ de saisie -------------------------------------------------------

interface ChampProps extends TextInputProps {
  etiquette: string;
}

export function Champ({ etiquette, style, ...reste }: ChampProps) {
  return (
    <View style={styles.champBloc}>
      <Text style={styles.champEtiquette}>{etiquette}</Text>
      <TextInput
        style={[styles.champ, style]}
        placeholderTextColor={couleurs.encreFaible}
        // Sans ça, le clavier d'iOS impose son fond clair au champ.
        keyboardAppearance="dark"
        {...reste}
      />
    </View>
  );
}

// --- Pastille de profil ----------------------------------------------------

const TEINTES = [
  { fond: 'rgba(124, 92, 255, 0.18)', encre: '#c3b2ff' },
  { fond: 'rgba(52, 211, 153, 0.16)', encre: '#7ee3bd' },
  { fond: 'rgba(96, 165, 250, 0.17)', encre: '#a5c9ff' },
  { fond: 'rgba(251, 113, 133, 0.16)', encre: '#ffa9b7' },
  { fond: 'rgba(251, 191, 36, 0.15)', encre: '#f5cf6e' },
  { fond: 'rgba(45, 212, 191, 0.16)', encre: '#7adfd4' },
];

/** La même règle que sur le site : une teinte stable par nom, parmi six. */
export function teinteDe(nom: string) {
  let somme = 0;
  for (let i = 0; i < nom.length; i += 1) {
    somme = (somme + nom.charCodeAt(i) * (i + 1)) % 997;
  }
  return TEINTES[somme % TEINTES.length];
}

export function initialesDe(nom: string) {
  const mots = String(nom ?? '?').trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

export function Badge({
  texte,
  ton = 'neutre',
}: {
  texte: string;
  ton?: 'neutre' | 'accent' | 'positif' | 'attention';
}) {
  const tons = {
    neutre: { fond: couleurs.surface, encre: couleurs.encreDouce },
    accent: { fond: couleurs.accentDoux, encre: couleurs.accentEncre },
    positif: { fond: couleurs.positifDoux, encre: couleurs.positif },
    attention: { fond: couleurs.attentionDoux, encre: couleurs.attention },
  }[ton];

  return (
    <View style={[styles.badge, { backgroundColor: tons.fond }]}>
      <Text style={[styles.badgeTexte, { color: tons.encre }]}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.carte,
    borderColor: couleurs.trait,
    borderWidth: 1,
    borderRadius: rayons.lg,
    padding: espaces.xl,
    gap: espaces.md,
  },
  titre: { ...typo.titre, color: couleurs.encre },
  sousTitre: { ...typo.sousTitre, color: couleurs.encre },
  aide: { ...typo.petit, color: couleurs.encreDouce, lineHeight: 20 },
  erreur: { ...typo.petit, color: couleurs.negatif, lineHeight: 20 },

  bouton: {
    borderRadius: rayons.md,
    paddingVertical: 14,
    paddingHorizontal: espaces.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  boutonPrincipal: { backgroundColor: couleurs.accent, borderColor: couleurs.accent },
  boutonDiscret: { backgroundColor: 'transparent', borderColor: couleurs.traitFort },
  boutonInactif: {
    backgroundColor: couleurs.surface,
    borderColor: couleurs.trait,
    shadowOpacity: 0,
    elevation: 0,
  },
  boutonPresse: { opacity: 0.82 },
  boutonTexte: { fontSize: 15, fontWeight: '600' },
  boutonTextePrincipal: { color: couleurs.encreInverse },
  boutonTexteDiscret: { color: couleurs.encre },
  boutonTexteInactif: { color: couleurs.encreFaible },

  champBloc: { gap: espaces.sm },
  champEtiquette: { ...typo.minuscule, color: couleurs.encreDouce },
  champ: {
    // Creusé : plus sombre que la carte qui le porte.
    backgroundColor: couleurs.nuit,
    borderColor: couleurs.traitFort,
    borderWidth: 1,
    borderRadius: rayons.md,
    paddingHorizontal: espaces.lg,
    paddingVertical: 13,
    color: couleurs.encre,
    fontSize: 15,
  },

  badge: {
    borderRadius: rayons.plein,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeTexte: { ...typo.minuscule },
});
