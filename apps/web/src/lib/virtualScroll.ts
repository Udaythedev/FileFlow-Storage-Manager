/**
 * Virtual Scrolling Utilities
 * Efficient rendering for large lists/grids without rendering all items
 */

export interface VirtualScrollConfig {
  itemHeight: number; // Height of each item in pixels
  containerHeight: number; // Height of visible container
  bufferSize?: number; // Extra items to render above/below viewport (default: 5)
  overscan?: number; // Deprecated - use bufferSize instead
}

export interface VirtualScrollState {
  visibleStart: number; // Index of first visible item
  visibleEnd: number; // Index of last visible item
  offsetY: number; // Scroll position in pixels
  totalHeight: number; // Total height of all items
}

/**
 * Calculate virtual scroll state from scroll position
 */
export function calculateVirtualState(
  scrollOffset: number,
  config: VirtualScrollConfig,
  totalItems: number
): VirtualScrollState {
  const { itemHeight, containerHeight, bufferSize = 5 } = config;

  // Calculate which items are visible
  const visibleStart = Math.floor(scrollOffset / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 1; // +1 for edge cases
  let visibleEnd = visibleStart + visibleCount;

  // Add buffer zone above and below
  const startIndex = Math.max(0, visibleStart - bufferSize);
  const endIndex = Math.min(totalItems - 1, visibleEnd + bufferSize);

  const totalHeight = totalItems * itemHeight;

  return {
    visibleStart: startIndex,
    visibleEnd: endIndex + 1, // +1 because end is exclusive
    offsetY: scrollOffset,
    totalHeight,
  };
}

/**
 * Calculate the pixel offset for a given item index
 */
export function getItemOffset(itemIndex: number, itemHeight: number): number {
  return itemIndex * itemHeight;
}

/**
 * Get array slice of visible items
 */
export function getVisibleItems<T>(items: T[], state: VirtualScrollState): T[] {
  return items.slice(state.visibleStart, state.visibleEnd);
}

/**
 * Calculate spacer heights for virtual rendering
 */
export function calculateSpacers(state: VirtualScrollState, itemHeight: number) {
  return {
    top: state.visibleStart * itemHeight,
    bottom: (state.totalHeight / itemHeight - state.visibleEnd) * itemHeight,
  };
}

/**
 * Hook-like state manager for virtual scrolling
 * Useful in vanilla JS or non-React contexts
 */
export class VirtualScroller {
  private config: VirtualScrollConfig;
  private totalItems: number;
  private currentState: VirtualScrollState;

  constructor(totalItems: number, config: VirtualScrollConfig) {
    this.totalItems = totalItems;
    this.config = config;
    this.currentState = calculateVirtualState(0, config, totalItems);
  }

  handleScroll(scrollOffset: number): VirtualScrollState {
    this.currentState = calculateVirtualState(scrollOffset, this.config, this.totalItems);
    return this.currentState;
  }

  updateTotalItems(newTotal: number): VirtualScrollState {
    this.totalItems = newTotal;
    // Clamp scroll position if new total is smaller
    const maxScroll = Math.max(0, this.totalItems * this.config.itemHeight - this.config.containerHeight);
    const scrollOffset = Math.min(this.currentState.offsetY, maxScroll);
    return this.handleScroll(scrollOffset);
  }

  getState(): VirtualScrollState {
    return this.currentState;
  }

  getVisibleRange(): { start: number; end: number } {
    return {
      start: this.currentState.visibleStart,
      end: this.currentState.visibleEnd,
    };
  }

  getTotalHeight(): number {
    return this.currentState.totalHeight;
  }

  jumpToIndex(index: number): number {
    const scrollOffset = getItemOffset(index, this.config.itemHeight);
    return this.handleScroll(scrollOffset).offsetY;
  }

  jumpToPercentage(percentage: number): number {
    const maxScroll = Math.max(0, this.getTotalHeight() - this.config.containerHeight);
    const scrollOffset = (percentage / 100) * maxScroll;
    return this.handleScroll(scrollOffset).offsetY;
  }
}

/**
 * Estimate rendering performance metrics
 */
export function estimatePerformance(
  totalItems: number,
  itemHeight: number,
  containerHeight: number,
  bufferSize: number = 5
) {
  const config: VirtualScrollConfig = { itemHeight, containerHeight, bufferSize };

  // Calculate items rendered at different scroll positions
  const topState = calculateVirtualState(0, config, totalItems);
  const middleScroll = (totalItems * itemHeight - containerHeight) / 2;
  const middleState = calculateVirtualState(middleScroll, config, totalItems);
  const bottomScroll = totalItems * itemHeight - containerHeight;
  const bottomState = calculateVirtualState(bottomScroll, config, totalItems);

  const renderedAtTop = topState.visibleEnd - topState.visibleStart;
  const renderedAtMiddle = middleState.visibleEnd - middleState.visibleStart;
  const renderedAtBottom = bottomState.visibleEnd - bottomState.visibleStart;

  return {
    totalItems,
    visibleItems: Math.ceil(containerHeight / itemHeight),
    renderedWithBuffer: renderedAtTop,
    memoryReduction: ((1 - renderedAtMiddle / totalItems) * 100).toFixed(1),
  };
}
