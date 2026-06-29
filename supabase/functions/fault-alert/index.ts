import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { vehicle_reg, driver_id, faults, inspection_id, invoice_no, notes } = await req.json();

    if (!vehicle_reg || !Array.isArray(faults) || faults.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_APIKEY') ?? Deno.env.get('RESEND_API_KEY') ?? '';
    if (!resendApiKey) {
      console.error('RESEND_APIKEY or RESEND_API_KEY is not configured in Supabase environment.');
      return new Response(
        JSON.stringify({ success: false, error: 'Resend API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminEmailRaw = Deno.env.get('ADMIN_EMAIL') ?? '';
    const toEmails = adminEmailRaw.split(',').map((e) => e.trim()).filter(Boolean);
    
    // Default fallback to user's email if no env variable is set
    if (toEmails.length === 0) {
      toEmails.push('reeqieric41@gmail.com');
    }

    const fromEmail = Deno.env.get('SENDER_EMAIL') ?? Deno.env.get('FROM_EMAIL') ?? 'Inyathi Alerts <onboarding@resend.dev>';

    const timestamp = new Date().toLocaleString('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Build plain text message fallback
    const faultListText = faults
      .map((f: string, i: number) => `${i + 1}. ${f}`)
      .join('\n');

    const rawTextMessage =
      `🚨 CRITICAL FAULT ALERT — INYATHI 🚨\n\n` +
      `Vehicle: ${vehicle_reg}\n` +
      `Driver ID: ${driver_id ?? 'N/A'}\n` +
      `Time: ${timestamp}\n` +
      `Booking / Invoice: ${invoice_no ?? 'N/A'}\n` +
      `Inspection ID: ${inspection_id ?? 'N/A'}\n\n` +
      `Faults reported:\n${faultListText}\n\n` +
      (notes ? `Notes:\n"${notes}"\n\n` : '') +
      `Action required: Vehicle must be inspected and repaired before the next trip.`;

    // Build beautiful HTML list of faults
    const faultsHtml = faults
      .map((f: string) => `<li style="margin-bottom: 8px;"><strong>${f}</strong></li>`)
      .join('');

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Critical Fault Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px 16px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <!-- Header Banner -->
    <div style="background-color: #dc2626; color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">🚨 Critical Fault Alert</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Inyathi Compliance Tracking System</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 24px; line-height: 1.6;">
      <!-- Vehicle Status Info -->
      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <span style="display: block; font-size: 11px; font-weight: 800; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">VEHICLE GROUNDED / ATTENTION REQUIRED</span>
        <span style="display: block; font-size: 24px; font-weight: 900; color: #991b1b; letter-spacing: -0.02em;">${vehicle_reg}</span>
      </div>

      <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">Report Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Driver ID:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${driver_id ?? 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Time of Report:</td>
          <td style="padding: 6px 0; color: #0f172a;">${timestamp}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Booking / Invoice:</td>
          <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${invoice_no ?? 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Inspection Ref:</td>
          <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${inspection_id ?? 'N/A'}</td>
        </tr>
      </table>

      <!-- Fault List -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #dc2626; border-bottom: 1px solid #fee2e2; padding-bottom: 6px;">Flagged Faults</h3>
        <div style="background-color: #fafafa; border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px 16px;">
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #1e293b; line-height: 1.8;">
            ${faultsHtml}
          </ul>
        </div>
      </div>

      <!-- Notes if any -->
      ${notes ? `
      <div style="margin-bottom: 24px;">
        <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">General Notes</h3>
        <p style="margin: 0; font-size: 13px; color: #475569; font-style: italic; background-color: #f8fafc; border-left: 3px solid #cbd5e1; padding: 10px 14px; border-radius: 0 6px 6px 0;">
          "${notes}"
        </p>
      </div>
      ` : ''}

      <!-- Next Steps -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 12px; color: #475569; text-align: center;">
        <p style="margin: 0 0 8px 0; font-weight: 700; color: #0f172a;">⚠️ ACTION REQUIRED</p>
        <p style="margin: 0;">This vehicle should undergo a mechanical check-up and repair before dispatching on its next trip.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
      Sent automatically by Inyathi compliance checker. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`;

    // Send email via Resend REST API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmails,
        subject: `🚨 CRITICAL FAULT ALERT: ${vehicle_reg}`,
        text: rawTextMessage,
        html: htmlBody,
      }),
    });

    const responseData = await resendResponse.json();
    const isSuccess = resendResponse.ok;

    if (isSuccess && inspection_id) {
      try {
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        await adminClient.from('inspections').update({ alert_sent: true }).eq('id', inspection_id);
      } catch (dbError) {
        console.error('Failed to update inspection table alert_sent status:', dbError);
      }
    }

    return new Response(JSON.stringify({ success: isSuccess, resend: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: isSuccess ? 200 : resendResponse.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('fault-alert error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
