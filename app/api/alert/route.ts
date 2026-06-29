import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { inspection, driver_name } = await req.json();

    const apiKey = process.env.RESEND_APIKEY;
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!apiKey) {
      console.error('RESEND_APIKEY is not defined in environment variables');
      return NextResponse.json({ success: false, error: 'RESEND_APIKEY not configured' }, { status: 500 });
    }

    if (!adminEmail) {
      console.error('ADMIN_EMAIL is not defined in environment variables');
      return NextResponse.json({ success: false, error: 'ADMIN_EMAIL not configured' }, { status: 500 });
    }

    // Format checklist keys for readability and compile the flagged items list
    const faults: string[] = [];
    if (inspection.checklist_json) {
      Object.entries(inspection.checklist_json).forEach(([item, status]) => {
        if (status === 'fail' || status === 'fault') {
          const desc = inspection.faults_json?.[item] || 'No specific description provided.';
          faults.push(`- <strong>${item.replace(/_/g, ' ')}</strong>: ${desc}`);
        }
      });
    }

    // If no specific checklist status is recorded but the sheet is overall marked as critical
    if (faults.length === 0 && (inspection.has_critical_fault || inspection.alert_sent)) {
      if (Array.isArray(inspection.faults_json)) {
        inspection.faults_json.forEach((f: string) => {
          faults.push(`- <strong>${f.replace(/_/g, ' ')}</strong>: Safety fault flagged`);
        });
      } else if (inspection.faults_json && typeof inspection.faults_json === 'object') {
        Object.entries(inspection.faults_json).forEach(([k, desc]) => {
          faults.push(`- <strong>${k.replace(/_/g, ' ')}</strong>: ${desc || 'Safety fault flagged'}`);
        });
      }
    }

    const emailSubject = `🚨 FAULT ALERT: Vehicle ${inspection.vehicle_reg} - ${inspection.inspection_type.toUpperCase()}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #ef4444; margin: 0 0 8px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">⚠️ Operational Fault Flagged</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Inyathi Compliance System &bull; Active Safety Monitor</p>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
          A vehicle inspection safety check has been completed by <strong>${driver_name}</strong> and has flagged active faults that require immediate attention before/after the trip.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #475569;">Field Details</th>
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #475569;">Recorded Value</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: 600; color: #475569;">Vehicle Reg Number:</td>
              <td style="padding: 10px; font-weight: 700; color: #0f172a;">${inspection.vehicle_reg}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: 600; color: #475569;">Inspection Type:</td>
              <td style="padding: 10px; font-weight: 700; color: #0f172a; text-transform: uppercase;">${inspection.inspection_type}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: 600; color: #475569;">Odometer Reading:</td>
              <td style="padding: 10px; font-weight: 700; color: #0f172a;">${inspection.mileage_at_inspection ? `${inspection.mileage_at_inspection.toLocaleString()} km` : 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-weight: 600; color: #475569;">Date/Time Recorded:</td>
              <td style="padding: 10px; color: #334155;">${new Date(inspection.created_at || inspection.submitted_at || new Date()).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: 600; color: #475569;">Booking Invoice Ref:</td>
              <td style="padding: 10px; color: #334155; font-family: monospace;">${inspection.invoice_no || 'None Linked'}</td>
            </tr>
          </tbody>
        </table>

        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin-bottom: 25px;">
          <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 15px; font-weight: 700; border-bottom: 1px solid #fecaca; padding-bottom: 6px;">Logged Safety Faults:</h3>
          <ul style="padding-left: 20px; font-size: 13px; color: #7f1d1d; line-height: 1.6; margin: 0;">
            ${faults.length > 0 ? faults.map(f => `<li style="margin-bottom: 6px;">${f}</li>`).join('') : '<li style="list-style: none;">One or more active safety warnings/faults were logged (check detailed breakdown).</li>'}
          </ul>
        </div>

        ${inspection.notes ? `
          <div style="background-color: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 4px; padding: 12px; margin-bottom: 25px; font-style: italic;">
            <strong style="color: #475569; font-size: 12px; display: block; margin-bottom: 4px; not-italic: true; font-style: normal;">Driver Additional Notes:</strong>
            <span style="font-size: 13px; color: #334155;">"${inspection.notes}"</span>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            This is an automated safety alert dispatched by the INYATHI Fleet Compliance Platform.<br/>
            Please coordinate with dispatchers and mechanical workshops for urgent resolution.
          </p>
        </div>
      </div>
    `;

    // Attempt to extract sending domain from configured ADMIN_EMAIL
    let sendDomain = 'inyathitravels.co.za';
    if (adminEmail && adminEmail.includes('@')) {
      const parts = adminEmail.split('@');
      if (parts.length > 1 && parts[1].trim() !== '') {
        sendDomain = parts[1].trim();
      }
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Inyathi Compliance <alerts@${sendDomain}>`,
        to: adminEmail,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const resJson = await res.json();
    if (!res.ok) {
      console.error('Resend API call failed:', resJson);
      return NextResponse.json({ success: false, error: resJson }, { status: res.status });
    }

    return NextResponse.json({ success: true, data: resJson });
  } catch (error: any) {
    console.error('Error sending resend email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
