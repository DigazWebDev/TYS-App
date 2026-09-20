import { Tabs } from 'expo-router';
import { StyleSheet, type ColorValue } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeTokens } from '@/hooks/use-theme';

export default function TabsLayout() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: tokens.accent.teal.default,
        tabBarInactiveTintColor: tokens.text.secondary,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: tokens.background.canvas,
          borderTopColor: tokens.border.subtle,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={
                focused
                  ? { ios: 'house.fill', android: 'home', web: 'home' }
                  : { ios: 'house', android: 'home', web: 'home' }
              }
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mensagens',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={
                focused
                  ? {
                      ios: 'bubble.left.fill',
                      android: 'chat_bubble',
                      web: 'chat_bubble',
                    }
                  : {
                      ios: 'bubble.left',
                      android: 'chat_bubble_outline',
                      web: 'chat_bubble_outline',
                    }
              }
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Pesquisa',
          tabBarIcon: ({ color }) => (
            <TabIcon
              name={{
                ios: 'magnifyingglass',
                android: 'search',
                web: 'search',
              }}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={
                focused
                  ? { ios: 'person.fill', android: 'person', web: 'person' }
                  : { ios: 'person', android: 'person_outline', web: 'person_outline' }
              }
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          href: null,
          title: 'Criar',
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          href: null,
          title: 'Inbox',
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
}: {
  name: SymbolViewProps['name'];
  color: ColorValue;
}) {
  return <SymbolView name={name} size={22} tintColor={color} />;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
