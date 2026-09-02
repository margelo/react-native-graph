import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GraphPage } from './screens/GraphPage';
import { BenchPage } from './screens/BenchPage';

const BENCH = process.env.EXPO_PUBLIC_RN_GRAPH_BENCH === '1';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      {BENCH ? <BenchPage /> : <GraphPage />}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
