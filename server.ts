import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { environment } from './src/app/environments/environment';

import { createServerClient } from '@supabase/ssr';
import { parse, serialize } from 'cookie';
import { SUPABASE_CLIENT } from './src/app/supabase.token';

const SUPABASE_URL = environment.supabaseUrl;
const SUPABASE_ANON_KEY = environment.supabaseKey;

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Serve static files
  server.get(
    '**',
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: 'index.html',
    })
  );

  server.get('**', async (req, res, next) => {
    try {
      // ✅ Crear cliente SSR de Supabase
      const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
          get(name) {
            const cookieHeader = req.headers.cookie ?? '';
            const cookies = parse(cookieHeader);
            return cookies[name];
          },
          set(name, value, options) {
            const cookie = serialize(name, value, options);
            res.appendHeader('Set-Cookie', cookie);
          },
          remove(name, options) {
            const cookie = serialize(name, '', { ...options, maxAge: 0 });
            res.appendHeader('Set-Cookie', cookie);
          },
        },
      });

      const html = await commonEngine.render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: req.baseUrl },
          { provide: SUPABASE_CLIENT, useValue: supabase },
        ],
      });

      res.send(html);
    } catch (err) {
      next(err);
    }
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;
  const serverInstance = app();
  serverInstance.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
