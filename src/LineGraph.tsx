import React from 'react'

import { AnimatedLineGraph } from './AnimatedLineGraph'
import type { LineGraphProps } from './LineGraphProps'
import { StaticLineGraph } from './StaticLineGraph'

export function LineGraphImpl<TEventPayload extends object>(
  props: LineGraphProps<TEventPayload>
): React.ReactElement {
  if (props.animated) return <AnimatedLineGraph<TEventPayload> {...props} />
  return <StaticLineGraph {...props} />
}

export const LineGraph = React.memo(LineGraphImpl) as typeof LineGraphImpl
