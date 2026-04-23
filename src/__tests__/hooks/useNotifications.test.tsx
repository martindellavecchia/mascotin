import { renderHook, waitFor } from '@testing-library/react';
import { useNotifications, useUnreadCount } from '@/hooks/useNotifications';

let mockActivity = {
  isVisible: true,
  isOnline: true,
  isActive: true,
};

jest.mock('@/hooks/usePageActivity', () => ({
  usePageActivity: () => mockActivity,
}));

describe('useNotifications hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActivity = {
      isVisible: true,
      isOnline: true,
      isActive: true,
    };
  });

  it('refetches unread count immediately when the page becomes active again', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ count: 4 }),
    });

    const { rerender } = renderHook(() => useUnreadCount(true));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    mockActivity = {
      isVisible: false,
      isOnline: true,
      isActive: false,
    };
    rerender();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    mockActivity = {
      isVisible: true,
      isOnline: true,
      isActive: true,
    };
    rerender();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('refetches the open notifications list immediately when the page becomes active again', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: [] }),
    });

    const { rerender } = renderHook(() => useNotifications(true));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    mockActivity = {
      isVisible: false,
      isOnline: true,
      isActive: false,
    };
    rerender();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    mockActivity = {
      isVisible: true,
      isOnline: true,
      isActive: true,
    };
    rerender();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
