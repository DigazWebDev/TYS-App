import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: () => (
            <Text style={{ fontSize: 22 }}>
              🏠
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: "Criar",
          tabBarIcon: () => (
            <Text style={{ fontSize: 22 }}>
              ➕
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: () => (
            <Text style={{ fontSize: 22 }}>
              💬
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: () => (
            <Text style={{ fontSize: 22 }}>
              👤
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
