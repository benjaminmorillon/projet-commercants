/**
 * L'espace commerçant dans l'application.
 *
 * Un commerçant qui se connecte n'a rien à faire des onglets du joueur : il
 * ne joue pas, il tient un comptoir. Ses quatre écrans sont ceux dont il se
 * sert dans la journée, du plus fréquent au plus rare : scanner un client,
 * répondre à ce qu'on lui demande, suivre ses offres, regarder qui vient.
 *
 * Deux choses restent sur le site, parce qu'elles se font assises : les
 * événements et le ciblage (des formulaires longs), et la carte de la
 * concurrence (une carte, justement).
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
        name="comptoir"
        options={{
          title: 'Comptoir',
          tabBarIcon: ({ color }) => <Icone symbole="✓" couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="offres"
        options={{
          title: 'Offres',
          tabBarIcon: ({ color }) => <Icone symbole="◎" couleur={color} />,
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
