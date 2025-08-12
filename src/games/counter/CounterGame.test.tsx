/**
 * Counter Game Component Tests
 * Focus on UI interactions and performance
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CounterGame } from './CounterGame'

const mockProps = {
  playerId: 'test-player',
  playerName: 'Test Player'
}

describe('CounterGame Component', () => {
  describe('Initial Render', () => {
    it('should render with initial count of 0', () => {
      render(<CounterGame {...mockProps} />)
      
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('+')).toBeInTheDocument()
      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.getByText('Reset')).toBeInTheDocument()
    })

    it('should show player name', () => {
      render(<CounterGame {...mockProps} />)
      
      expect(screen.getByText(/Test Player/)).toBeInTheDocument()
    })
  })

  describe('Counter Operations', () => {
    it('should increment counter when + button clicked', () => {
      render(<CounterGame {...mockProps} />)
      
      const incrementButton = screen.getByText('+')
      fireEvent.click(incrementButton)
      
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should decrement counter when - button clicked', () => {
      render(<CounterGame {...mockProps} />)
      
      const decrementButton = screen.getByText('-')
      fireEvent.click(decrementButton)
      
      expect(screen.getByText('-1')).toBeInTheDocument()
    })

    it('should reset counter when Reset button clicked', () => {
      render(<CounterGame {...mockProps} />)
      
      // Increment first
      const incrementButton = screen.getByText('+')
      fireEvent.click(incrementButton)
      fireEvent.click(incrementButton)
      expect(screen.getByText('2')).toBeInTheDocument()
      
      // Reset
      const resetButton = screen.getByText('Reset')
      fireEvent.click(resetButton)
      
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should handle multiple rapid clicks efficiently', () => {
      render(<CounterGame {...mockProps} />)
      
      const incrementButton = screen.getByText('+')
      const start = performance.now()
      
      // Perform 100 rapid clicks
      for (let i = 0; i < 100; i++) {
        fireEvent.click(incrementButton)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should handle 100 clicks quickly (less than 50ms)
      expect(duration).toBeLessThan(50)
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  describe('Keyboard Interactions', () => {
    it('should handle keyboard shortcuts if implemented', () => {
      render(<CounterGame {...mockProps} />)
      
      // Test if arrow keys work (if implemented)
      fireEvent.keyDown(document, { key: 'ArrowUp', code: 'ArrowUp' })
      
      // This might increment if keyboard support is added
      // For now, just verify it doesn't crash
      expect(screen.getByText(/[0-9-]+/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<CounterGame {...mockProps} />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3) // +, -, Reset
      
      // Buttons should have meaningful text
      expect(screen.getByText('+')).toBeInTheDocument()
      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.getByText('Reset')).toBeInTheDocument()
    })
  })

  describe('Performance Tests', () => {
    it('should render quickly', () => {
      const start = performance.now()
      
      // Render 10 instances
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<CounterGame {...mockProps} />)
        unmount()
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should render 10 instances quickly (less than 20ms)
      expect(duration).toBeLessThan(20)
    })

    it('should handle state updates efficiently', () => {
      render(<CounterGame {...mockProps} />)
      
      const incrementButton = screen.getByText('+')
      const decrementButton = screen.getByText('-')
      
      const start = performance.now()
      
      // Mix of increment and decrement operations
      for (let i = 0; i < 50; i++) {
        fireEvent.click(incrementButton)
        fireEvent.click(decrementButton)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should handle 100 state updates quickly (less than 30ms)
      expect(duration).toBeLessThan(30)
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      render(<CounterGame {...mockProps} />)
      
      const incrementButton = screen.getByText('+')
      
      // Increment to a large number
      for (let i = 0; i < 1000; i++) {
        fireEvent.click(incrementButton)
      }
      
      expect(screen.getByText('1000')).toBeInTheDocument()
    })

    it('should handle very negative numbers', () => {
      render(<CounterGame {...mockProps} />)
      
      const decrementButton = screen.getByText('-')
      
      // Decrement to a large negative number
      for (let i = 0; i < 1000; i++) {
        fireEvent.click(decrementButton)
      }
      
      expect(screen.getByText('-1000')).toBeInTheDocument()
    })

    it('should maintain state consistency during rapid operations', () => {
      render(<CounterGame {...mockProps} />)
      
      const incrementButton = screen.getByText('+')
      const decrementButton = screen.getByText('-')
      const resetButton = screen.getByText('Reset')
      
      // Complex sequence of operations
      for (let i = 0; i < 10; i++) {
        fireEvent.click(incrementButton)
        fireEvent.click(incrementButton)
        fireEvent.click(decrementButton)
        
        if (i === 5) {
          fireEvent.click(resetButton)
        }
      }
      
      // After reset at i=5, we should have done 4 more cycles of +2-1 = +1 each
      expect(screen.getByText('4')).toBeInTheDocument()
    })
  })
})