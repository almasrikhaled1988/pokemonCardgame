import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Card } from '../types'

export const useUIStore = defineStore('ui', () => {
  const hoveredCard = ref<Card | null>(null)
  const tooltipPosition = ref({ x: 0, y: 0 })
  const isTooltipVisible = ref(false)

  function showTooltip(card: Card, x: number, y: number) {
    hoveredCard.value = card
    tooltipPosition.value = { x, y }
    isTooltipVisible.value = true
  }

  function hideTooltip() {
    isTooltipVisible.value = false
    // Small delay before clearing data to allow fade out if we add transitions
    setTimeout(() => {
      if (!isTooltipVisible.value) {
        hoveredCard.value = null
      }
    }, 100)
  }

  function updateTooltipPosition(x: number, y: number) {
    if (isTooltipVisible.value) {
      tooltipPosition.value = { x, y }
    }
  }

  return {
    hoveredCard,
    tooltipPosition,
    isTooltipVisible,
    showTooltip,
    hideTooltip,
    updateTooltipPosition
  }
})
