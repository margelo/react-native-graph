<a href="https://margelo.io">
  <img src="./img/banner.svg" width="100%" />
</a>

<img src="./img/change.gif" align="right" width="35%">

# 📈 react-native-graph

Beautiful, high-performance Graphs/Charts for React Native.

## Installation


<pre>
yarn add <a href="https://github.com/software-mansion/react-native-reanimated">react-native-reanimated</a>
yarn add <a href="https://github.com/software-mansion/react-native-gesture-handler">react-native-gesture-handler</a>
yarn add <a href="https://github.com/Shopify/react-native-skia">@shopify/react-native-skia</a>
yarn add <b>react-native-graph</b>
</pre>

## Usage

```jsx
function App() {
  const priceHistory = usePriceHistory('ethereum')

  return <LineGraph points={priceHistory} />
}
```

### `animated`

Whether to animate between changes.

Example:

```jsx
<LineGraph
  points={priceHistory}
  animated={true}
/>
```

<img src="./img/change.gif">

### `enablePanGesture`

Whether to enable the pan gesture.

There are three events fired when the user interacts with the graph:

1. `onGestureStart`: Fired once the user presses and holds down on the graph. The pan gesture _activates_.
2. `onPointSelected`: Fired for each point the user pans through. You can use this event to update labels or highlight selection in the graph.
3. `onGestureEnd`: Fired once the user releases his finger and the pan gesture _deactivates_.

Example:

```jsx
<LineGraph
  points={priceHistory}
  enablePanGesture={true}
  onGestureStart={() => hapticFeedback('impactLight')}
  onPointSelected={(p) => updatePriceTitle(p)}
  onGestureEnd={() => resetPriceTitle()}
/>
```

<img src="./img/pan.gif">

## Adopting at scale

react-native-graph was built at Margelo, an elite app development agency. For enterprise support or other business inquiries, contact us at <a href="mailto:hello@margelo.io?subject=Adopting react-native-graph at scale">hello@margelo.io</a>!
