// server/src/supabaseGateway.ts
// Local Supabase Gateway for KaushalSetu
// Exposes standard Supabase HTTP protocol endpoints (/auth/v1, /rest/v1, /functions/v1)
// connected directly to the kaushalsetu_supabase PostgreSQL database.
// Allows @supabase/supabase-js to operate natively during local development and testing.

import { Router, Request, Response } from 'express';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import path from 'path';
import { pathToFileURL } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

const { Pool, Client } = pg;
const SUPABASE_DB_URL = process.env.SUPABASE_DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/kaushalsetu_supabase';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'kaushalsetu-sovereign-secret-2026';

const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
});

export const supabaseGateway = Router();

// ---------------------------------------------------------------------------
// JWT Verification Helper
// ---------------------------------------------------------------------------
function getClaimsFromAuthHeader(req: Request): { sub: string | null; role: string; email?: string } {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return { sub: null, role: 'anon' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return { sub: null, role: 'anon' };
  }

  const token = parts[1];
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.sub) {
      return {
        sub: decoded.sub,
        role: decoded.role || 'authenticated',
        email: decoded.email,
      };
    }
  } catch {
    // Malformed token
  }

  return { sub: null, role: 'anon' };
}

// ---------------------------------------------------------------------------
// 1. SUPABASE AUTH ENDPOINTS (/auth/v1)
// ---------------------------------------------------------------------------

// POST /auth/v1/token?grant_type=password
supabaseGateway.post('/auth/v1/token', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Email and password required' });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, email, encrypted_password, raw_user_meta_data 
       FROM auth.users 
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid login credentials' });
    }

    const authUser = userRes.rows[0];

    // Verify bcrypt password via PostgreSQL pgcrypto crypt
    const cryptRes = await pool.query(
      `SELECT (crypt($1, $2) = $2) as match`,
      [password, authUser.encrypted_password]
    );

    if (!cryptRes.rows[0]?.match) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid login credentials' });
    }

    // Resolve profile
    const profileRes = await pool.query(
      `SELECT id, name, email, role FROM public.profiles WHERE id = $1`,
      [authUser.id]
    );
    const profile = profileRes.rows[0];

    const payload = {
      sub: authUser.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: authUser.email,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: profile?.name || authUser.raw_user_meta_data?.name },
      exp: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = jwt.sign(payload, JWT_SECRET);

    return res.json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 86400,
      refresh_token: `refresh_${authUser.id}`,
      user: {
        id: authUser.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: authUser.email,
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { name: profile?.name },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Auth error in supabaseGateway:', err);
    return res.status(500).json({ error: 'server_error', error_description: err.message });
  }
});

// GET /auth/v1/user
supabaseGateway.get('/auth/v1/user', async (req: Request, res: Response) => {
  const claims = getClaimsFromAuthHeader(req);
  if (!claims.sub) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  }

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.email, p.name, p.role
       FROM auth.users u
       LEFT JOIN public.profiles p ON p.id = u.id
       WHERE u.id = $1`,
      [claims.sub]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'user_not_found', message: 'User not found' });
    }

    const row = userRes.rows[0];
    return res.json({
      id: row.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: row.email,
      user_metadata: { name: row.name, role: row.role },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /auth/v1/logout
supabaseGateway.post('/auth/v1/logout', (_req: Request, res: Response) => {
  res.status(200).json({});
});

// ---------------------------------------------------------------------------
// 2. SUPABASE REST / RPC ENDPOINTS (/rest/v1)
// ---------------------------------------------------------------------------

// POST /rest/v1/rpc/:func
supabaseGateway.post('/rest/v1/rpc/:func', async (req: Request, res: Response) => {
  const func = req.params.func;
  const claims = getClaimsFromAuthHeader(req);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (claims.sub) {
      await client.query(`SET LOCAL "request.jwt.claim.sub" = '${claims.sub}'`);
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated'`);
      await client.query(`SET LOCAL ROLE authenticated`);
    } else {
      await client.query(`SET LOCAL "request.jwt.claim.sub" = ''`);
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'anon'`);
      await client.query(`SET LOCAL ROLE anon`);
    }

    let queryRes;

    if (func === 'get_trainee_dossier') {
      const p_id = req.body?.p_id || 'me';
      queryRes = await client.query('SELECT public.get_trainee_dossier($1::TEXT) as result', [p_id]);
    } else if (func === 'get_outcomes_summary') {
      queryRes = await client.query('SELECT public.get_outcomes_summary() as result');
    } else if (func === 'get_employer_candidates') {
      const p_emp = req.body?.p_employer_id || 'default';
      queryRes = await client.query('SELECT public.get_employer_candidates($1::TEXT) as result', [p_emp]);
    } else if (func === 'get_provider_batches') {
      const p_tp = req.body?.p_provider_id || 'default';
      queryRes = await client.query('SELECT public.get_provider_batches($1::TEXT) as result', [p_tp]);
    } else if (func === 'get_government_analytics') {
      const { p_district, p_programme, p_provider } = req.body || {};
      queryRes = await client.query(
        'SELECT public.get_government_analytics($1::TEXT, $2::TEXT, $3::TEXT) as result',
        [p_district || null, p_programme || null, p_provider || null]
      );
    } else if (func === 'record_programme_action') {
      const { p_action_type, p_district, p_amount, p_notes } = req.body || {};
      queryRes = await client.query(
        'SELECT public.record_programme_action($1::TEXT, $2::TEXT, $3::NUMERIC, $4::TEXT) as result',
        [p_action_type, p_district || null, p_amount || null, p_notes || null]
      );
    } else {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: `Function ${func} not found` });
    }

    await client.query('COMMIT');
    const result = queryRes.rows[0]?.result;
    return res.json(result);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`RPC error in ${func}:`, err.message);
    const statusCode = err.code === '42501' ? 403 : 500;
    return res.status(statusCode).json({ message: err.message, code: err.code });
  } finally {
    client.release();
  }
});

// GET /rest/v1/:table (Generic RLS table query handler)
supabaseGateway.get('/rest/v1/:table', async (req: Request, res: Response) => {
  const table = req.params.table;
  const claims = getClaimsFromAuthHeader(req);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (claims.sub) {
      await client.query(`SET LOCAL "request.jwt.claim.sub" = '${claims.sub}'`);
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated'`);
      await client.query(`SET LOCAL ROLE authenticated`);
    } else {
      await client.query(`SET LOCAL "request.jwt.claim.sub" = ''`);
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'anon'`);
      await client.query(`SET LOCAL ROLE anon`);
    }

    // Parse simple eq query params, e.g. ?id=eq.123 or ?user_id=eq.123
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === 'string' && val.startsWith('eq.')) {
        const cleanVal = val.slice(3);
        conditions.push(`"${key}" = $${paramIndex++}`);
        values.push(cleanVal);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM public."${table}" ${whereClause} ORDER BY created_at DESC LIMIT 100`;

    const result = await client.query(query, values);
    await client.query('COMMIT');

    // If PostgREST single object header was requested
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('application/vnd.pgrst.object+json')) {
      if (result.rows.length === 0) {
        return res.status(404).json({ code: 'PGRST116', message: 'The result contains 0 rows' });
      }
      return res.json(result.rows[0]);
    }

    return res.json(result.rows);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`Error querying table ${table}:`, err.message);
    const statusCode = err.code === '42501' ? 403 : 500;
    return res.status(statusCode).json({ message: err.message, code: err.code });
  } finally {
    client.release();
  }
});

// PATCH /rest/v1/:table (e.g. notifications mark as read)
supabaseGateway.patch('/rest/v1/:table', async (req: Request, res: Response) => {
  const table = req.params.table;
  const claims = getClaimsFromAuthHeader(req);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (claims.sub) {
      await client.query(`SET LOCAL "request.jwt.claim.sub" = '${claims.sub}'`);
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated'`);
      await client.query(`SET LOCAL ROLE authenticated`);
    } else {
      await client.query(`SET LOCAL "request.jwt.claim.sub" = ''`);
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'anon'`);
      await client.query(`SET LOCAL ROLE anon`);
    }

    // Parse eq query params, e.g. ?id=eq.notif_1
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === 'string' && val.startsWith('eq.')) {
        conditions.push(`"${key}" = $${paramIndex++}`);
        values.push(val.slice(3));
      }
    }

    const setClauses: string[] = [];
    for (const [col, val] of Object.entries(req.body)) {
      setClauses.push(`"${col}" = $${paramIndex++}`);
      values.push(val);
    }

    if (setClauses.length === 0 || conditions.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Update fields and filter required' });
    }

    const updateQuery = `UPDATE public."${table}" SET ${setClauses.join(', ')} WHERE ${conditions.join(' AND ')} RETURNING *`;
    const result = await client.query(updateQuery, values);
    await client.query('COMMIT');

    return res.json(result.rows);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`Error updating table ${table}:`, err.message);
    const statusCode = err.code === '42501' ? 403 : 500;
    return res.status(statusCode).json({ message: err.message, code: err.code });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// 3. SUPABASE EDGE FUNCTION INVOCATION ENDPOINTS (/functions/v1)
// ---------------------------------------------------------------------------

async function forwardToEdgeFunction(functionName: string, req: Request, res: Response) {
  try {
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const standardReq = new globalThis.Request(fullUrl, {
      method: req.method,
      headers: req.headers as any,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const funcPath = path.resolve(`../supabase/functions/${functionName}/index.ts`);
    const fileUrl = pathToFileURL(funcPath).href;
    const mod = await import(fileUrl);
    const handler = mod.default;

    const handlerRes = await handler(standardReq as any);
    const responseData = await handlerRes.json().catch(() => ({}));

    res.status(handlerRes.status);
    handlerRes.headers.forEach((val: string, key: string) => {
      res.setHeader(key, val);
    });

    return res.json(responseData);
  } catch (err: any) {
    console.error('Edge Function forwarding error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

supabaseGateway.all('/functions/v1/:functionName', (req: Request, res: Response) => {
  const func = Array.isArray(req.params.functionName) ? req.params.functionName[0] : req.params.functionName;
  forwardToEdgeFunction(func, req, res);
});

// ---------------------------------------------------------------------------
// 4. SUPABASE REALTIME PROTOCOL GATEWAY (/realtime/v1/websocket)
// ---------------------------------------------------------------------------
export function initRealtimeGateway(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const subscriptions = new Map<WebSocket, Set<string>>();

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/realtime/v1/websocket')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Dedicated PostgreSQL client for realtime NOTIFY listening
  const listenerClient = new Client({
    connectionString: SUPABASE_DB_URL,
  });

  listenerClient.connect().then(() => {
    listenerClient.query('LISTEN realtime_notifications');
    console.log('[Realtime Gateway] Listening for PostgreSQL notification triggers on channel: realtime_notifications');
  }).catch((err: any) => {
    console.error('[Realtime Gateway] Failed to connect PostgreSQL listener:', err.message);
  });

  listenerClient.on('notification', (msg: any) => {
    if (msg.channel === 'realtime_notifications' && msg.payload) {
      try {
        const payload = JSON.parse(msg.payload);
        if (payload.table === 'notifications' && payload.action === 'INSERT') {
          const rec = payload.record;
          const targetTopic = `realtime:user-notifications-${rec.user_id}`;
          const altTopic = `user-notifications-${rec.user_id}`;

          const message = JSON.stringify({
            topic: targetTopic,
            event: 'postgres_changes',
            payload: {
              data: {
                columns: [
                  { name: 'id', type: 'uuid' },
                  { name: 'user_id', type: 'uuid' },
                  { name: 'title', type: 'text' },
                  { name: 'message', type: 'text' },
                  { name: 'read', type: 'bool' },
                  { name: 'created_at', type: 'timestamptz' },
                ],
                commit_timestamp: new Date().toISOString(),
                errors: null,
                record: rec,
                schema: 'public',
                table: 'notifications',
                type: 'INSERT',
              },
              ids: [rec.id],
            },
            ref: null,
          });

          // Broadcast to matching subscribers
          for (const [ws, topics] of subscriptions.entries()) {
            if (ws.readyState === WebSocket.OPEN) {
              if (topics.has(targetTopic) || topics.has(altTopic)) {
                ws.send(message);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('[Realtime Gateway] Error processing notification event:', err);
      }
    }
  });

  wss.on('connection', (ws) => {
    subscriptions.set(ws, new Set());

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const { topic, event, payload, ref } = msg;

        if (event === 'heartbeat') {
          ws.send(JSON.stringify({
            topic: 'phoenix',
            event: 'phx_reply',
            payload: { response: {}, status: 'ok' },
            ref,
          }));
        } else if (event === 'phx_join') {
          const subs = subscriptions.get(ws);
          if (subs) {
            subs.add(topic);
          }
          ws.send(JSON.stringify({
            topic,
            event: 'phx_reply',
            payload: {
              response: {
                postgres_changes: payload?.config?.postgres_changes || [],
              },
              status: 'ok',
            },
            ref,
          }));
        } else if (event === 'phx_leave') {
          const subs = subscriptions.get(ws);
          if (subs) {
            subs.delete(topic);
          }
          ws.send(JSON.stringify({
            topic,
            event: 'phx_reply',
            payload: { response: {}, status: 'ok' },
            ref,
          }));
        }
      } catch (err) {
        console.error('[Realtime Gateway] WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      subscriptions.delete(ws);
    });

    ws.on('error', (err) => {
      console.warn('[Realtime Gateway] WebSocket client error:', err.message);
      subscriptions.delete(ws);
    });
  });
}

