import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('returns the updated value after the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Initial value
    expect(result.current).toBe('initial')

    // Update the value
    rerender({ value: 'updated', delay: 500 })

    // Value should still be the old one immediately
    expect(result.current).toBe('initial')

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Now the debounced value should be updated
    expect(result.current).toBe('updated')
  })

  it('resets the timer when value changes before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    )

    expect(result.current).toBe('first')

    // Update value before timer expires
    rerender({ value: 'second', delay: 500 })
    expect(result.current).toBe('first')

    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(200)
    })
    expect(result.current).toBe('first')

    // Update value again
    rerender({ value: 'third', delay: 500 })

    // Advance time to complete the full delay from the last update
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe('third')
  })

  it('works with different data types', () => {
    // Test with number
    const { result: numberResult, rerender: rerenderNumber } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 42 } }
    )

    expect(numberResult.current).toBe(42)
    rerenderNumber({ value: 100 })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(numberResult.current).toBe(100)

    // Test with object
    const { result: objectResult, rerender: rerenderObject } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: { name: 'John' } } }
    )

    expect(objectResult.current).toEqual({ name: 'John' })
    rerenderObject({ value: { name: 'Jane' } })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(objectResult.current).toEqual({ name: 'Jane' })
  })

  it('handles delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 1000 } }
    )

    rerender({ value: 'updated', delay: 1000 })

    // Advance time by less than the delay
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe('test')

    // Change delay to a shorter one
    rerender({ value: 'updated', delay: 200 })

    // Advance time by the new delay amount
    act(() => {
      jest.advanceTimersByTime(200)
    })

    expect(result.current).toBe('updated')
  })

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    const { unmount } = renderHook(() => useDebounce('test', 500))

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('works with zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'updated', delay: 0 })

    // With zero delay, should update immediately
    expect(result.current).toBe('updated')
  })
})