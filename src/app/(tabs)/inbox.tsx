import { Redirect, type Href } from 'expo-router';

export default function InboxRedirect() {
  return <Redirect href={'/(tabs)/messages' as Href} />;
}
