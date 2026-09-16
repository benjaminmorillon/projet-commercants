/**
 * La barre d'onglets du bas — les quatre destinations principales, comme sur
 * le site. Les autres pages viendront s'y rattacher.
 */
import { Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';
import { NomUnivers, couleurs, univers } from '../../src/design/theme';

/**
 * Les icônes, dessinées au texte pour l'instant.
 *
 * C'est volontairement provisoire : embarquer une bibliothèque d'icônes
 * ajoute plusieurs mégaoctets au téléchargement de l'application pour quatre
 * dessins. On les remplacera par les mêmes tracés SVG que le site.
 */
function Icone({ symbole, couleur }: { symbole: string; couleur: ColorValue }) {
  return <Text style={{ fontSize: 19, color: couleur }}>{symbole}</Text>;
}

/**
 * Quels onglets ont une couleur à eux.
 *
 * Les autres — Lieux, Offres, Amis, Duos — gardent le violet du site. Quatre
 * teintes, pas huit : au-delà, ce n'est plus un repère, c'est un
 * arc-en-ciel.
 */
const UNIVERS_PAR_ONGLET: Record<string, NomUnivers> = {
  index: 'profil',
  missions: 'missions',
  carte: 'carte',
  code: 'code',
};

export default function Onglets() {
  return (
    <Tabs
      // Les options dépendent de l'onglet : chacun allume son icône dans SA
      // couleur, celle de l'écran où il mène.
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: univers[UNIVERS_PAR_ONGLET[route.name] ?? 'defaut'].encre,
        tabBarInactiveTintColor: couleurs.encreFaible,
        tabBarStyle: {
          backgroundColor: couleurs.carte,
          borderTopColor: couleurs.trait,
          height: 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: couleurs.fond },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Icone symbole="◍" couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          tabBarIcon: ({ color }) => <Icone symbole="◆" couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="code"
        options={{
          // « Code » et non « Mon code » : à six onglets, le libellé est
          // tronqué en « Mon co… », ce qui ne veut plus rien dire.
          title: 'Code',
          tabBarIcon: ({ color }) => <Icone symbole="▣" couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="carte"
        options={{
          title: 'Quartier',
          tabBarIcon: ({ color }) => <Icone symbole="◇" couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="lieux"
        options={{
          title: 'Lieux',
          tabBarIcon: ({ color }) => <Icone symbole="◈" couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="offres"
        options={{
          title: 'Offres',
          tabBarIcon: ({ color }) => <Icone symbole="◎" couleur={color} />,
        }}
      />

      {/* Amis et duos existent, mais pas dans la barre : à six onglets, on ne
          lit plus les libellés. On y entre depuis le profil, qui est déjà la
          page de « moi et les autres ». `href: null` garde l'écran
          navigable tout en le retirant de la barre. */}
      <Tabs.Screen name="amis" options={{ href: null }} />
      <Tabs.Screen name="duos" options={{ href: null }} />
    </Tabs>
  );
}
