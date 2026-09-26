import { getDbClient } from './db.ts';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'TRAINEE' | 'EMPLOYER' | 'TRAINING_PROVIDER' | 'GOVERNMENT';
  traineeId?: string;
  employerId?: string;
  providerId?: string;
}

export async function authenticateRequest(
  req: Request,
  requiredRole?: string | string[]
): Promise<{ user: AuthenticatedUser | null; errorResponse: Response | null }> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({ success: false, error: 'Authorization header is missing' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({ success: false, error: 'Malformed authorization token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const token = parts[1];
  let userId: string | null = null;

  // If token is a JWT (3 dot-separated parts)
  if (token.includes('.')) {
    try {
      const payloadBase64 = token.split('.')[1];
      let payloadJson = '';
      if (typeof Buffer !== 'undefined') {
        payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      } else {
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
        payloadJson = atob(padded);
      }
      const payload = JSON.parse(payloadJson);
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return {
          user: null,
          errorResponse: new Response(
            JSON.stringify({ success: false, error: 'Token has expired' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }
      userId = payload.sub || payload.id;
    } catch {
      return {
        user: null,
        errorResponse: new Response(
          JSON.stringify({ success: false, error: 'Invalid JWT token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
  } else {
    // Direct UUID in test / bearer
    userId = token;
  }

  if (!userId) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({ success: false, error: 'Missing subject ID in token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Resolve user identity & role strictly from database
  const client = getDbClient();
  await client.connect();

  try {
    const profileRes = await client.query(
      'SELECT id, name, email, role FROM public.profiles WHERE id = $1',
      [userId]
    );

    if (profileRes.rows.length === 0) {
      return {
        user: null,
        errorResponse: new Response(
          JSON.stringify({ success: false, error: 'User profile not found' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }

    const row = profileRes.rows[0];
    const user: AuthenticatedUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
    };

    // Pre-resolve stakeholder entities
    if (user.role === 'TRAINEE') {
      const trRes = await client.query('SELECT id FROM public.trainees WHERE user_id = $1', [user.id]);
      if (trRes.rows.length > 0) user.traineeId = trRes.rows[0].id;
    } else if (user.role === 'EMPLOYER') {
      const empRes = await client.query('SELECT id FROM public.employers WHERE user_id = $1', [user.id]);
      if (empRes.rows.length > 0) user.employerId = empRes.rows[0].id;
    } else if (user.role === 'TRAINING_PROVIDER') {
      const tpRes = await client.query('SELECT id FROM public.training_providers WHERE user_id = $1', [user.id]);
      if (tpRes.rows.length > 0) user.providerId = tpRes.rows[0].id;
    }

    // Role verification
    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowedRoles.includes(user.role)) {
        return {
          user: null,
          errorResponse: new Response(
            JSON.stringify({
              success: false,
              error: `Access denied: role ${user.role} is not permitted for this operation. Required: ${allowedRoles.join(', ')}`,
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }
    }

    return { user, errorResponse: null };
  } finally {
    await client.end();
  }
}
