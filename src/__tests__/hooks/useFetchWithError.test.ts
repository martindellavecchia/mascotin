import { renderHook } from '@testing-library/react';
import { useFetchWithError } from '@/hooks/useFetchWithError';

describe('useFetchWithError', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    jest.clearAllMocks();
  });

  it('returns fetchWithError function', () => {
    const { result } = renderHook(() => useFetchWithError());
    expect(typeof result.current.fetchWithError).toBe('function');
  });

  it('returns abort function', () => {
    const { result } = renderHook(() => useFetchWithError());
    expect(typeof result.current.abort).toBe('function');
  });

  it('fetches data successfully with GET', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('{"data":"success","message":"Data fetched"}'),
    });

    const { result } = renderHook(() => useFetchWithError());
    const response = await result.current.fetchWithError('/api/test-success');

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ data: 'success', message: 'Data fetched' });
  });

  it('fetches data successfully with POST', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('{"data":{"name":"Test"},"success":true}'),
    });

    const { result } = renderHook(() => useFetchWithError());
    const response = await result.current.fetchWithError('/api/test-post', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ data: { name: 'Test' }, success: true });
  });

  it('handles server errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('{"error":"Server error"}'),
    });

    const { result } = renderHook(() => useFetchWithError());
    const response = await result.current.fetchWithError('/api/test-error', { showError: false });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Server error');
  });

  it('handles 404 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('{"error":"Not found"}'),
    });

    const { result } = renderHook(() => useFetchWithError());
    const response = await result.current.fetchWithError('/api/not-found', { showError: false });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Not found');
  });

  it('handles 401 unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('{"error":"Unauthorized"}'),
    });

    const { result } = renderHook(() => useFetchWithError());
    const response = await result.current.fetchWithError('/api/unauthorized', { showError: false });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Unauthorized');
  });

  it('sends custom headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('{"success":true}'),
    });

    const { result } = renderHook(() => useFetchWithError());
    await result.current.fetchWithError('/api/headers-test', {
      headers: {
        'X-Custom-Header': 'custom-value',
        Authorization: 'Bearer token',
      },
    });

    expect(mockFetch).toHaveBeenCalled();
    const options = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = options.headers as Headers;
    expect(headers.get('X-Custom-Header')).toBe('custom-value');
    expect(headers.get('Authorization')).toBe('Bearer token');
  });
});
