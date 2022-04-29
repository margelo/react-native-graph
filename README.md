<a href="https://margelo.io">
  <img src="./img/banner.svg" width="100%" />
</a>

<img src="./img/change.gif" align="right" width="35%">

# 📈 react-native-graph

Beautiful, high-performance Graphs/Charts for React Native.

## Installation

1. Install [react-native-reanimated (v2)](https://github.com/software-mansion/react-native-reanimated)
    ```sh
    yarn add react-native-reanimated
    ```
2. Install [react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler)
    ```sh
    yarn add react-native-gesture-handler
    ```
3. Install [@shopify/react-native-skia](https://github.com/Shopify/react-native-skia)
    ```sh
    yarn add @shopify/react-native-skia
    ```
4. Install **react-native-graph**
    ```sh
    yarn add react-native-graph
    ```

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
