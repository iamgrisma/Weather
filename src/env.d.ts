/// <reference types="astro/client" />

type KVNamespace = import('@cloudflare/workers-types').KVNamespace;
type D1Database = import('@cloudflare/workers-types').D1Database;

type ENV = {
  WEATHER_KV: KVNamespace;
  WEATHER_DB: D1Database;
  SITE_URL?: string;
  CRON_SECRET?: string;
  REFRESH_SECRET?: string;
};

declare module 'cloudflare:workers' {
  interface Env extends ENV {}
  export const env: Env;
}

declare namespace App {
  interface Locals {
    cfContext?: any;
    [key: string]: any;
  }
}
