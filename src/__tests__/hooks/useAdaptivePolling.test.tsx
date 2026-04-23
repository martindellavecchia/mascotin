import { act, renderHook } from '@testing-library/react';
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling';

describe('useAdaptivePolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('starts with the active interval and then backs off to the idle interval', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAdaptivePolling({
        enabled: true,
        onPoll,
        activeIntervalMs: 5_000,
        idleIntervalMs: 15_000,
        recentActivityWindowMs: 1_000,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(14_999);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(3);
  });

  it('pauses polling while the document is hidden', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAdaptivePolling({
        enabled: true,
        onPoll,
        activeIntervalMs: 5_000,
        idleIntervalMs: 15_000,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);

    act(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      jest.advanceTimersByTime(20_000);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);
  });
});
