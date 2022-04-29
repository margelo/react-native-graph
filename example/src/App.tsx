import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GraphPage } from './GraphPage';

export default function App() {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GraphPage />
    </GestureHandlerRootView>
  );
}

