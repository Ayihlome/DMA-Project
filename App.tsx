import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Dashboard from "./src/screens/Dashboard";
import Profile from "./src/screens/Profile";
import Restock from "./src/screens/Restock";
import Sales from "./src/screens/Sales";
import Supply from "./src/screens/Supply";
import { NavProvider, useNav } from "./src/nav";
import { BottomNav, Header, NAV_H } from "./src/shell";
import { StoreProvider } from "./src/store";
import { colors } from "./src/theme";
import { ToastProvider } from "./src/toast";

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function Screen() {
  const { route, key } = useNav();
  if (route.name === "sales") return <Sales key={key} />;
  if (route.name === "supply") return <Supply key={key} />;
  if (route.name === "restock") return <Restock key={key} />;
  if (route.name === "profile") return <Profile key={key} />;
  return <Dashboard key={key} />;
}

function AppFrame() {
  const insets = useSafeAreaInsets();
  return (
    <ToastProvider bottomOffset={NAV_H + insets.bottom}>
      <View style={styles.app}>
        <Header />
        <View style={styles.content}>
          <Screen />
        </View>
        <BottomNav />
      </View>
    </ToastProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return <Loading />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <StoreProvider fallback={<Loading />}>
        <NavProvider>
          <AppFrame />
        </NavProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bgBase },
  content: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgBase,
  },
});
