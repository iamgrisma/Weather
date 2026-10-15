/// <reference types="astro/client" />

type KVNamespace = import('@cloudflare/workers-types').KVNamespace;
type D1Database = import('@cloudflare/workers-types').D1Database;

type ENV = {
  WEATHER_KV: KVNamespace;
  WEATHER_DB: D1Database;
  SITE_URL: string;
};

type Runtime = import('@astrojs/cloudflare').Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {}
}
