export class RequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch('/api/' + path, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new RequestError(
      response.status,
      'O servidor retornou uma resposta inesperada.',
    );
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('auth/'))
      window.dispatchEvent(new Event('nexo-session-expired'));
    throw new RequestError(
      response.status,
      (data as { error?: string }).error ||
        'Não foi possível concluir a operação.',
    );
  }
  return data as T;
}
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Algo deu errado. Tente novamente.';
