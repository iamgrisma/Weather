// Shim for cloudflare:workers when running in local Node or dev environment
export const env: any = (globalThis as any).__CF_ENV__ || (globalThis as any).env || (typeof process !== 'undefined' ? process.env : {}) || {};
export default { env };
