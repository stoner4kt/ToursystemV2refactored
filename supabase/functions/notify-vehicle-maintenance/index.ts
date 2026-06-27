import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const resendKey  = Deno.env.get('RESEND_API_KEY') ?? '';
    const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? 'info@inyathitours.com';

    if (!resendKey) {
      console.warn('RESEND_API_KEY not set — vehicle maintenance notification not emailed.');
      return new Response(JSON.stringify({ success: true, warning: 'Resend API Key not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    let bookingsToNotify = [];

    if (body.booking) {
      // Direct invocation for a specific booking
      bookingsToNotify = [body.booking];
    } else {
      // General scan: Find bookings starting in ~2 days (between 36 and 60 hours from now)
      // that have not had their maintenance alert sent yet.
      const now = new Date();
      const twoDaysFromNowStart = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString();
      const twoDaysFromNowEnd = new Date(now.getTime() + 60 * 60 * 60 * 1000).toISOString();

      const { data: scanBookings, error: scanErr } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .gte('start_date', twoDaysFromNowStart)
        .lte('start_date', twoDaysFromNowEnd)
        .eq('maintenance_alert_sent', false);

      if (scanErr) {
        throw new Error(`Failed to scan bookings: ${scanErr.message}`);
      }
      bookingsToNotify = scanBookings || [];
    }

    const results = [];

    for (const b of bookingsToNotify) {
      const vehicleReg = b.assigned_vehicle_reg || b.rented_vehicle_reg || 'Unknown';
      
      // Fetch the latest vehicle checklist logged for this vehicle
      const { data: latestChecklist, error: checklistErr } = await supabaseAdmin
        .from('vehicle_checklists')
        .select('*, profiles(name)')
        .eq('vehicle_reg', vehicleReg)
        .order('checklist_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: vehicleInfo } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('registration_no', vehicleReg)
        .maybeSingle();

      const checklistStatus = latestChecklist 
        ? `Last logged on ${latestChecklist.checklist_date} (Status: ${latestChecklist.status})` 
        : 'No recent checklist found';

      const subject = `⚠️ Vehicle Condition & Maintenance Reminder — Booking ${b.invoice_no} (${vehicleReg})`;

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;border:1px solid #e2e8f0;border-radius:12px;background-color:#ffffff">
          <h2 style="color:#0f2744;margin-bottom:4px;font-size:20px;letter-spacing:-0.5px">INYATHI Fleet Compliance</h2>
          <p style="color:#f59e0b;font-weight:700;margin-top:0;font-size:14px">⚠️ Pre-Trip Vehicle Maintenance Check Requirement</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
          
          <p style="font-size:14px;color:#334155;line-height:1.5">
            This is a 2-day priority reminder that vehicle <strong>${vehicleReg}</strong> is scheduled for an upcoming booking starting on <strong>${new Date(b.start_date).toLocaleDateString()}</strong>.
          </p>

          <h3 style="color:#0f2744;font-size:14px;margin-top:24px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Upcoming Booking Details</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;background-color:#f8fafc;border-radius:8px">
            <tr><td style="padding:10px 12px;color:#64748b;width:140px">Invoice Number</td><td style="padding:10px 12px;font-weight:700;color:#0f2744">${b.invoice_no}</td></tr>
            <tr><td style="padding:10px 12px;color:#64748b">Client Name</td><td style="padding:10px 12px;color:#1e293b;font-weight:600">${b.client_name}</td></tr>
            <tr><td style="padding:10px 12px;color:#64748b">Planned Route</td><td style="padding:10px 12px;color:#1e293b">${b.route || b.tour_reference || 'N/A'}</td></tr>
            <tr><td style="padding:10px 12px;color:#64748b">Departure Date</td><td style="padding:10px 12px;color:#1e293b;font-weight:600">${new Date(b.start_date).toLocaleString()}</td></tr>
          </table>

          <h3 style="color:#0f2744;font-size:14px;margin-top:24px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Vehicle Condition Audit</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;background-color:#f8fafc;border-radius:8px">
            <tr><td style="padding:10px 12px;color:#64748b;width:140px">Vehicle Reg</td><td style="padding:10px 12px;font-weight:700;color:#0f2744">${vehicleReg}</td></tr>
            <tr><td style="padding:10px 12px;color:#64748b">Current Odometer</td><td style="padding:10px 12px;color:#1e293b">${vehicleInfo?.current_mileage ? `${vehicleInfo.current_mileage} km` : 'N/A'}</td></tr>
            <tr><td style="padding:10px 12px;color:#64748b">Next Service Due</td><td style="padding:10px 12px;color:#1e293b;font-weight:600;color:#b45309">${vehicleInfo?.next_service_mileage ? `${vehicleInfo.next_service_mileage} km` : 'N/A'}</td></tr>
            <tr><td style="padding:10px 12px;color:#64748b">Weekly Checklist</td><td style="padding:10px 12px;color:#1e293b;font-weight:600">${checklistStatus}</td></tr>
          </table>

          ${latestChecklist ? `
          <div style="margin-top:16px;padding:12px;background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;font-size:12px">
            <strong style="color:#78350f">Checklist Details:</strong>
            <ul style="margin:6px 0 0;padding-left:16px;color:#451a03">
              <li>Exterior Panel Condition: ${latestChecklist.exterior || 'N/A'}</li>
              <li>Mechanical & Horn: ${latestChecklist.mechanical || 'N/A'}</li>
              <li>Fluids Check (Oil/Coolant): ${latestChecklist.fluids || 'N/A'}</li>
              <li>Brakes & Tires: Brakes: ${latestChecklist.brakes || 'N/A'}, Tires: ${latestChecklist.tires || 'N/A'}</li>
              <li>Lights & Indicators: ${latestChecklist.lights || 'N/A'}</li>
            </ul>
          </div>
          ` : ''}

          <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 16px;border-radius:8px;margin:24px 0">
            <strong style="color:#15803d;font-size:13px">Required Compliance Steps:</strong>
            <p style="margin:6px 0 0;color:#166534;font-size:12px;line-height:1.5">
              Please ensure the assigned driver executes their 10-point mechanical safety pre-trip inspection prior to dispatch. You can audit submitted inspections in the Compliance &amp; Checklists dashboard.
            </p>
          </div>
          
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
          <p style="font-size:11px;color:#94a3b8;text-align:center">INYATHI Tours · Fleet Management System · Automated Operational Compliance Alert</p>
        </div>`;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'INYATHI Compliance <compliance@inyathitours.com>',
          to: [adminEmail],
          subject,
          html,
        }),
      });

      if (emailRes.ok) {
        results.push({ invoice_no: b.invoice_no, success: true });
        // Mark as sent
        await supabaseAdmin
          .from('bookings')
          .update({ maintenance_alert_sent: true })
          .eq('invoice_no', b.invoice_no);
      } else {
        const errText = await emailRes.text();
        results.push({ invoice_no: b.invoice_no, success: false, error: errText });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('notify-vehicle-maintenance error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
