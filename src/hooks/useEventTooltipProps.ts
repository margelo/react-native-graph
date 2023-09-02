import { useCallback, useState } from 'react'

import {
  EventTooltipComponentProps,
  GraphEventWithCords,
} from '../LineGraphProps'

/**
 * Returns props for tooltip of active graph event.
 */
export const useEventTooltipProps = <TEventPayload extends object>(
  eventsWithCords: GraphEventWithCords<TEventPayload>[] | null,
  onEventHover?: () => void
) => {
  const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null)
  const handleDisplayEventTooltip = useCallback(
    (eventIndex: number, isDisplayed: boolean) => {
      if (activeEventIndex === eventIndex && !isDisplayed)
        setActiveEventIndex(null)

      if (activeEventIndex === null && isDisplayed) {
        onEventHover?.()
        setActiveEventIndex(eventIndex)
      }
    },
    [activeEventIndex, onEventHover]
  )
  const activeEvent =
    eventsWithCords && typeof activeEventIndex === 'number'
      ? eventsWithCords[activeEventIndex]
      : null
  const eventTooltipProps: EventTooltipComponentProps<TEventPayload> | null =
    activeEvent
      ? {
          eventX: activeEvent.x,
          eventY: activeEvent.y,
          eventPayload: activeEvent.payload,
        }
      : null

  return { handleDisplayEventTooltip, eventTooltipProps }
}
