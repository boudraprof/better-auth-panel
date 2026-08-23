// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

import ServerStatus from '#/components/ServerStatus'

// jsdom lacks ResizeObserver, which radix-ui tooltip sizing relies on.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= ResizeObserverMock

// Router Link needs a real router context — replace with a plain anchor.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

const apiGet = vi.fn()
vi.mock('#/utils/axios', () => ({
  default: { get: (...args: unknown[]) => apiGet(...args) },
}))

const hardwareData = {
  hostname: 'test-host',
  platform: 'linux',
  arch: 'x64',
  nodeVersion: 'v24.0.0',
  uptime: { days: 2, hours: 3, minutes: 4, seconds: 5 },
  cpu: {
    model: 'Test CPU',
    cores: 8,
    loadAvg: { '1m': 1.5, '5m': 1.0, '15m': 0.5 },
    loadPercent: 40,
  },
  memory: { total: 16_000_000_000, used: 8_000_000_000, free: 8_000_000_000, percent: 50 },
  disk: { total: 0, free: 0, used: 0, percent: 0 },
}

describe('ServerStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders CPU and memory percentages after fetching', async () => {
    apiGet.mockResolvedValue({ data: hardwareData })
    render(<ServerStatus />)

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/admin/hardware'))
    expect(await screen.findByText('40%')).toBeTruthy()
    expect(screen.getByText('50%')).toBeTruthy()
    // link points at the system info page
    expect(screen.getByRole('link').getAttribute('href')).toBe('/sys-info')
  })

  it('shows a detailed tooltip on hover', async () => {
    apiGet.mockResolvedValue({ data: hardwareData })
    render(<ServerStatus />)

    const link = await screen.findByRole('link')
    // Radix tooltip updates internal state on focus/pointer events; wrap them
    // in act() so React flushes the update synchronously (avoids the
    // "not wrapped in act(...)" warning).
    await act(async () => {
      link.focus()
      fireEvent.focus(link)
      fireEvent.pointerEnter(link)
    })
    await waitFor(() => expect(screen.getByText('test-host')).toBeTruthy())
    expect(screen.getByText(/2d 3h 4m 5s/)).toBeTruthy()
    // formatBytes(16_000_000_000) = 14.9 GB (GiB division)
    expect(screen.getByText(/14\.9 GB/)).toBeTruthy()
  })

  it('falls back to Offline when the fetch fails', async () => {
    apiGet.mockRejectedValue(new Error('boom'))
    render(<ServerStatus />)

    await waitFor(() => expect(apiGet).toHaveBeenCalled())
    expect(await screen.findByText('Offline')).toBeTruthy()
  })
})
