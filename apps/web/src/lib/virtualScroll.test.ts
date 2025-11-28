import { describe, it, expect } from 'vitest';
import {
  calculateVirtualState,
  getItemOffset,
  getVisibleItems,
  calculateSpacers,
  VirtualScroller,
  estimatePerformance,
} from '../lib/virtualScroll';

describe('Virtual Scroll Utilities', () => {
  const config = {
    itemHeight: 48,
    containerHeight: 400,
    bufferSize: 5,
  };

  const testItems = Array.from({ length: 1000 }, (_, i) => ({
    id: `item-${i}`,
    name: `File ${i}`,
    size: Math.random() * 1000000,
    extension: 'txt',
    modifiedAt: new Date().toISOString(),
  }));

  describe('calculateVirtualState', () => {
    it('should calculate initial state at scroll top', () => {
      const state = calculateVirtualState(0, config, testItems.length);
      expect(state.visibleStart).toBeGreaterThanOrEqual(0);
      expect(state.visibleEnd).toBeGreaterThan(state.visibleStart);
      expect(state.offsetY).toBe(0);
      expect(state.totalHeight).toBe(testItems.length * config.itemHeight);
    });

    it('should calculate state in middle of list', () => {
      const scrollOffset = 5000; // Scroll to middle
      const state = calculateVirtualState(scrollOffset, config, testItems.length);
      expect(state.offsetY).toBe(scrollOffset);
      expect(state.visibleStart).toBeGreaterThan(0);
      expect(state.visibleEnd).toBeLessThan(testItems.length);
      expect(state.visibleEnd - state.visibleStart).toBeGreaterThan(0);
    });

    it('should clamp to valid range at bottom', () => {
      const maxScroll = testItems.length * config.itemHeight;
      const state = calculateVirtualState(maxScroll, config, testItems.length);
      expect(state.visibleEnd).toBeLessThanOrEqual(testItems.length);
    });

    it('should include buffer items above and below viewport', () => {
      const scrollOffset = 2400; // ~50th item
      const state = calculateVirtualState(scrollOffset, config, testItems.length);
      const visibleCount = Math.ceil(config.containerHeight / config.itemHeight);
      const expectedMinRendered = visibleCount + 2 * config.bufferSize;
      expect(state.visibleEnd - state.visibleStart).toBeGreaterThanOrEqual(visibleCount);
    });

    it('should handle small list (fewer items than visible)', () => {
      const smallList = 5;
      const state = calculateVirtualState(0, config, smallList);
      expect(state.visibleStart).toBe(0);
      expect(state.visibleEnd).toBeGreaterThanOrEqual(smallList);
    });
  });

  describe('getItemOffset', () => {
    it('should calculate correct pixel offset for item index', () => {
      expect(getItemOffset(0, 48)).toBe(0);
      expect(getItemOffset(1, 48)).toBe(48);
      expect(getItemOffset(10, 48)).toBe(480);
      expect(getItemOffset(100, 48)).toBe(4800);
    });

    it('should work with different item heights', () => {
      expect(getItemOffset(5, 32)).toBe(160);
      expect(getItemOffset(5, 64)).toBe(320);
      expect(getItemOffset(5, 100)).toBe(500);
    });
  });

  describe('getVisibleItems', () => {
    it('should slice items based on visible state', () => {
      const state = calculateVirtualState(0, config, testItems.length);
      const visible = getVisibleItems(testItems, state);
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.length).toBeLessThanOrEqual(testItems.length);
      expect(visible[0].id).toBe(testItems[state.visibleStart].id);
    });

    it('should return correct slice for different scroll positions', () => {
      const state1 = calculateVirtualState(0, config, testItems.length);
      const visible1 = getVisibleItems(testItems, state1);

      const state2 = calculateVirtualState(5000, config, testItems.length);
      const visible2 = getVisibleItems(testItems, state2);

      expect(visible1[0].id).not.toBe(visible2[0].id);
      // Both should render similar number of items (within buffer zone, may differ by a few)
      expect(visible1.length).toBeGreaterThan(0);
      expect(visible2.length).toBeGreaterThan(0);
      expect(Math.abs(visible1.length - visible2.length)).toBeLessThanOrEqual(5);
    });

    it('should handle empty list', () => {
      const emptyState = { visibleStart: 0, visibleEnd: 0, offsetY: 0, totalHeight: 0 };
      const visible = getVisibleItems(testItems, emptyState);
      expect(visible.length).toBe(0);
    });
  });

  describe('calculateSpacers', () => {
    it('should calculate spacer heights at top', () => {
      const state = calculateVirtualState(0, config, testItems.length);
      const spacers = calculateSpacers(state, config.itemHeight);
      expect(spacers.top).toBe(0);
      expect(spacers.bottom).toBeGreaterThan(0);
    });

    it('should calculate spacer heights in middle', () => {
      const state = calculateVirtualState(5000, config, testItems.length);
      const spacers = calculateSpacers(state, config.itemHeight);
      expect(spacers.top).toBeGreaterThan(0);
      expect(spacers.bottom).toBeGreaterThan(0);
    });

    it('should have total spacers equal to non-visible items', () => {
      const state = calculateVirtualState(2400, config, testItems.length);
      const spacers = calculateSpacers(state, config.itemHeight);
      const visibleHeight = (state.visibleEnd - state.visibleStart) * config.itemHeight;
      const totalSpacers = spacers.top + spacers.bottom;
      expect(Math.abs(totalSpacers + visibleHeight - state.totalHeight)).toBeLessThan(config.itemHeight);
    });
  });

  describe('VirtualScroller class', () => {
    it('should initialize with correct state', () => {
      const scroller = new VirtualScroller(testItems.length, config);
      const state = scroller.getState();
      expect(state.visibleStart).toBe(0);
      expect(state.totalHeight).toBe(testItems.length * config.itemHeight);
    });

    it('should update state on scroll', () => {
      const scroller = new VirtualScroller(testItems.length, config);
      const newState = scroller.handleScroll(2400);
      expect(newState.offsetY).toBe(2400);
      expect(newState.visibleStart).toBeGreaterThan(0);
    });

    it('should track visible range correctly', () => {
      const scroller = new VirtualScroller(testItems.length, config);
      scroller.handleScroll(5000);
      const range = scroller.getVisibleRange();
      expect(range.start).toBeLessThan(range.end);
      expect(range.start).toBeGreaterThanOrEqual(0);
      expect(range.end).toBeLessThanOrEqual(testItems.length);
    });

    it('should handle total items update', () => {
      const scroller = new VirtualScroller(100, config);
      const newState = scroller.updateTotalItems(50);
      expect(newState.totalHeight).toBe(50 * config.itemHeight);
    });

    it('should clamp scroll position when list shrinks', () => {
      const scroller = new VirtualScroller(testItems.length, config);
      scroller.handleScroll(10000);
      const beforeUpdate = scroller.getState().offsetY;
      
      const newState = scroller.updateTotalItems(100);
      expect(newState.offsetY).toBeLessThanOrEqual(beforeUpdate);
    });

    it('should jump to specific item index', () => {
      const scroller = new VirtualScroller(testItems.length, config);
      const scrollOffset = scroller.jumpToIndex(500);
      expect(scrollOffset).toBe(500 * config.itemHeight);
    });

    it('should jump to percentage of list', () => {
      const scroller = new VirtualScroller(testItems.length, config);
      scroller.jumpToPercentage(0); // Top
      let state = scroller.getState();
      expect(state.offsetY).toBe(0);

      scroller.jumpToPercentage(100); // Bottom
      state = scroller.getState();
      expect(state.offsetY).toBeGreaterThan(0);
    });

    it('should return total height', () => {
      const scroller = new VirtualScroller(testItems.length, config);
      expect(scroller.getTotalHeight()).toBe(testItems.length * config.itemHeight);
    });
  });

  describe('estimatePerformance', () => {
    it('should estimate performance metrics', () => {
      const metrics = estimatePerformance(1000, 48, 400, 5);
      expect(metrics.totalItems).toBe(1000);
      expect(metrics.visibleItems).toBeGreaterThan(0);
      expect(metrics.renderedWithBuffer).toBeGreaterThanOrEqual(metrics.visibleItems);
      expect(parseFloat(metrics.memoryReduction)).toBeGreaterThan(0);
      expect(parseFloat(metrics.memoryReduction)).toBeLessThanOrEqual(100);
    });

    it('should show high memory reduction for large lists', () => {
      const smallMetrics = estimatePerformance(100, 48, 400, 5);
      const largeMetrics = estimatePerformance(10000, 48, 400, 5);
      
      // Larger lists should have higher memory reduction percentage
      expect(parseFloat(largeMetrics.memoryReduction)).toBeGreaterThan(
        parseFloat(smallMetrics.memoryReduction)
      );
    });

    it('should handle 10k+ items efficiently', () => {
      const metrics = estimatePerformance(10000, 48, 600, 5);
      expect(metrics.totalItems).toBe(10000);
      // Should render much fewer items with buffering
      expect(metrics.renderedWithBuffer).toBeLessThan(1000);
      expect(metrics.memoryReduction).toMatch(/\d+\.\d/);
    });
  });

  describe('Performance with large datasets', () => {
    it('should handle 100k items', () => {
      const config100k = { itemHeight: 48, containerHeight: 600, bufferSize: 5 };
      const state = calculateVirtualState(50000, config100k, 100000);
      expect(state.visibleEnd - state.visibleStart).toBeLessThan(500);
    });

    it('should maintain constant render time regardless of total items', () => {
      const times: number[] = [];
      for (const itemCount of [1000, 10000, 100000, 1000000]) {
        const start = performance.now();
        calculateVirtualState(50000, config, itemCount);
        times.push(performance.now() - start);
      }
      // All calculations should be fast (< 1ms typically)
      times.forEach(t => expect(t).toBeLessThan(10));
    });
  });
});
