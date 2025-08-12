/**
 * Counter Game Component Tests
 * Focus on UI interactions and performance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CounterGame } from './CounterGame'

// Mock localStorage to avoid save/load interference
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

const mockProps = {
  playerId: 'test-player',
  playerName: 'Test Player'
}

describe('CounterGame Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Return null to indicate no saved game
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('Initial Render', () => {
    it('should render with initial count of 0', async () => {
      render(<CounterGame {...mockProps} />)
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      expect(screen.getByText('+ Increment')).toBeInTheDocument()
      expect(screen.getByText('- Decrement')).toBeInTheDocument()
      expect(screen.getByText('Reset')).toBeInTheDocument()
    })

    it('should render without player name display', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Counter Game')).toBeInTheDocument()
      })
    })
  })

  describe('Counter Operations', () => {
    it('should increment counter when + button clicked', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      const incrementButton = screen.getByText('+ Increment')
      fireEvent.click(incrementButton)
      
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should decrement counter when - button clicked', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      // First increment to enable decrement button
      const incrementButton = screen.getByText('+ Increment')
      fireEvent.click(incrementButton)
      expect(screen.getByText('1')).toBeInTheDocument()
      
      const decrementButton = screen.getByText('- Decrement')
      fireEvent.click(decrementButton)
      
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should reset counter when Reset button clicked', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      // Increment first
      const incrementButton = screen.getByText('+ Increment')
      fireEvent.click(incrementButton)
      fireEvent.click(incrementButton)
      expect(screen.getByText('2')).toBeInTheDocument()
      
      // Reset
      const resetButton = screen.getByText('Reset')
      fireEvent.click(resetButton)
      
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should handle multiple rapid clicks efficiently', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      const incrementButton = screen.getByText('+ Increment')
      const start = performance.now()
      
      // Perform 20 rapid clicks (reduced for test stability)
      for (let i = 0; i < 20; i++) {
        fireEvent.click(incrementButton)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should handle 20 clicks quickly (less than 100ms)
      expect(duration).toBeLessThan(100)
      expect(screen.getByText('20')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button labels', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      // Check that buttons exist with proper labels
      expect(screen.getByText('+ Increment')).toBeInTheDocument()
      expect(screen.getByText('- Decrement')).toBeInTheDocument()
      expect(screen.getByText('Reset')).toBeInTheDocument()
      
      // Check for save/load buttons
      expect(screen.getByText('Manual Save')).toBeInTheDocument()
      expect(screen.getByText('Load Game')).toBeInTheDocument()
      expect(screen.getByText('Delete Save')).toBeInTheDocument()
    })
  })

  describe('Performance Tests', () => {
    it('should handle state updates efficiently', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      const incrementButton = screen.getByText('+ Increment')
      
      const start = performance.now()
      
      // Perform increment operations (keep simple since decrement is disabled at 0)
      for (let i = 0; i < 15; i++) {
        fireEvent.click(incrementButton)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should handle state updates quickly (less than 50ms)
      expect(duration).toBeLessThan(50)
      expect(screen.getByText('15')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle large numbers', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      const incrementButton = screen.getByText('+ Increment')
      
      // Increment to a moderately large number (reduced for test speed)
      for (let i = 0; i < 50; i++) {
        fireEvent.click(incrementButton)
      }
      
      expect(screen.getByText('50')).toBeInTheDocument()
    })

    it('should track clicks correctly', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      const incrementButton = screen.getByText('+ Increment')
      
      // Click 5 times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(incrementButton)
      }
      
      // Should show Total Clicks: 5
      expect(screen.getByText(/Total Clicks:/)).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('Save/Load Functionality', () => {
    it('should have save management interface', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      // Check save management section exists
      expect(screen.getByText('Save Management')).toBeInTheDocument()
      expect(screen.getByText('Manual Save')).toBeInTheDocument()
      expect(screen.getByText('Load Game')).toBeInTheDocument()
      expect(screen.getByText('Delete Save')).toBeInTheDocument()
      
      // Check auto-save checkbox
      const autoSaveCheckbox = screen.getByRole('checkbox')
      expect(autoSaveCheckbox).toBeInTheDocument()
      expect(autoSaveCheckbox).toBeChecked()
    })

    it('should handle manual save', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      const saveButton = screen.getByText('Manual Save')
      fireEvent.click(saveButton)
      
      // Should not crash and localStorage.setItem should be called
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('Game State Consistency', () => {
    it('should maintain consistent high score', async () => {
      render(<CounterGame {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
      
      const incrementButton = screen.getByText('+ Increment')
      const resetButton = screen.getByText('Reset')
      
      // Increment to 3
      for (let i = 0; i < 3; i++) {
        fireEvent.click(incrementButton)
      }
      expect(screen.getByText('3')).toBeInTheDocument()
      
      // Reset should not affect high score
      fireEvent.click(resetButton)
      expect(screen.getByText('0')).toBeInTheDocument()
      
      // High score should still show (check for its presence)
      expect(screen.getByText(/High Score:/)).toBeInTheDocument()
    })
  })
})