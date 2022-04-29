import React from 'react'
import { AnimatedLineGraph } from './AnimatedLineGraph'
import type { LineGraphProps } from './LineGraphProps'
import { StaticLineGraph } from './StaticLineGraph'

function LineGraphImpl(props: LineGraphProps): React.ReactElement {
  if (props.animated) return <AnimatedLineGraph {...props} />
  else return <StaticLineGraph {...props} />
}

export const LineGraph = React.memo(LineGraphImpl)
