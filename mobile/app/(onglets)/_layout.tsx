/**
 * La barre d'onglets du bas — les quatre destinations principales, comme sur
 * le site. Les autres pages viendront s'y rattacher.
 */
import { Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';
import { couleurs } from '../../src/design/theme';

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

export default function Onglets() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: couleurs.accentEncre,
        tabBarInactiveTintColor: couleurs.encreFaible,
        tabBarStyle: {
          backgroundColor: couleurs.carte,
          borderTopColor: couleurs.trait,
          height: 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: couleurs.fond },
      }}
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
    </Tabs>
  );
}
