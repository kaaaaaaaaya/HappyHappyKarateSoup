const deriveCloudRunApiBase = (): string | null => {
  const hostname = window.location.hostname;
  if (!hostname.endsWith('.a.run.app')) {
    return null;
  }
  if (!hostname.includes('-web-')) {
    return null;
  }

  return `${window.location.protocol}//${hostname.replace('-web-', '-api-')}`;
};

export const resolveApiBaseUrl = (): string => {
  const envApiBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
  const runtimeApiBase = `${window.location.protocol}//${window.location.hostname}:8080`.replace(/\/$/, '');
  const cloudRunApiBase = deriveCloudRunApiBase();
  const runtimeFallback = cloudRunApiBase ?? runtimeApiBase;

  if (!envApiBase) {
    return runtimeFallback;
  }

  try {
    const envHost = new URL(envApiBase).hostname;
    if (envHost === 'localhost' && window.location.hostname !== 'localhost') {
      return runtimeFallback;
    }
    return envApiBase;
  } catch {
    return runtimeFallback;
  }
};
