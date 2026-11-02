type HeaderSource = Headers | Record<string, string | string[] | undefined> | undefined;

function readHeader(headers: HeaderSource, name: string) {
  if (!headers) return undefined;
  if (headers instanceof Headers) return headers.get(name) ?? undefined;
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function getClientIp(headers: HeaderSource) {
  return (
    readHeader(headers, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    readHeader(headers, 'x-real-ip')?.trim() ||
    'unknown'
  );
}
