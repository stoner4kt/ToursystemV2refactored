import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const validResourceTypes = new Set(['image', 'video', 'raw']);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function toUrlSafeBase64(bytes: ArrayBuffer) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function createDeliverySignature(deliveryPath: string, apiSecret: string) {
  const digest = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(`${deliveryPath}${apiSecret}`),
  );
  return toUrlSafeBase64(digest).slice(0, 8);
}

function encodePublicId(publicId: string) {
  return publicId.split('/').map((part) => encodeURIComponent(part)).join('/');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization') || '';
    if (!/^Bearer\s+\S+$/i.test(authorization)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    const publicId = typeof body?.publicId === 'string' ? body.publicId.trim() : '';
    const resourceType = typeof body?.resourceType === 'string'
      ? body.resourceType.trim().toLowerCase()
      : '';
    const asAttachment = body?.asAttachment === true;

    if (!publicId || publicId.length > 512 || /[\u0000-\u001f\u007f]/.test(publicId)) {
      return json({ error: 'publicId is required and must be valid' }, 400);
    }
    if (!validResourceTypes.has(resourceType)) {
      return json({ error: 'Invalid resourceType' }, 400);
    }
    if (body?.asAttachment !== undefined && typeof body.asAttachment !== 'boolean') {
      return json({ error: 'asAttachment must be a boolean' }, 400);
    }

    const cloudName = requiredEnv('CLOUDINARY_CLOUD_NAME');
    const apiSecret = requiredEnv('CLOUDINARY_API_SECRET');
    const encodedPublicId = encodePublicId(publicId);
    const deliveryPath = asAttachment ? `fl_attachment/${encodedPublicId}` : encodedPublicId;
    const signature = await createDeliverySignature(deliveryPath, apiSecret);
    const signedUrl = [
      `https://res.cloudinary.com/${encodeURIComponent(cloudName)}`,
      resourceType,
      'authenticated',
      `s--${signature}--`,
      deliveryPath,
    ].join('/');

    return json({ signedUrl });
  } catch (error) {
    console.error('[get-signed-url] Failed to generate delivery URL:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Unable to generate Cloudinary signed URL' }, 500);
  }
});