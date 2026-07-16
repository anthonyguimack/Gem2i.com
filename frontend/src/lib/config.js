// Central config — use BACKEND_URL instead of process.env.REACT_APP_BACKEND_URL directly
// so every build works even when the env var is not set (relative URLs via nginx proxy).
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
