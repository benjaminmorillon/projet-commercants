/**
 * L'espace commerçant dans l'application.
 *
 * Un commerçant qui se connecte n'a rien à faire des onglets du joueur : il
 * ne joue pas, il tient un comptoir. Deux écrans lui suffisent, et ce sont
 * ceux dont il se sert plusieurs fois par jour — scanner un client, et
 * regarder qui vient.
 *
 * Le reste de son espace (offres, événements, ciblage, concurrence) reste sur
 * le site : ça se fait assis, pas debout derrière une caisse.
 */
import { Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';
import { couleurs } from '../../src/design/theme';

function Icone({ symbole, couleur }: { symbole: string; couleur: ColorValue }) {
  return <Text style={{ fontSize: 19, color: couleur }}>{symbole}</Text>;
}

export default function OngletsCommercant() {
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
      {/* Le scanner est l'écran d'accueil du commerçant : c'est ce qu'il
          ouvre vingt fois par jour. Il s'appelle donc « index », qui est la
          destination de `/(commercant)`. */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color }) => <Icone symbole="▣" couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color }) => <Icone symbole="◍" couleur={color} />,
        }}
      />
    </Tabs>
  );
}
