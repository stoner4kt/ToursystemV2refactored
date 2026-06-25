# INYATHI Fleet Management - Supabase & Vercel/Netlify Deployment Guide

This guide describes how to connect your existing Supabase database (containing roles, fleet data, and profiles) with this application and deploy it successfully to Vercel or Netlify.

---

## 1. Environment Variables Configuration

Do **not** share your Supabase Secret keys in public forums or chat rooms. Instead, supply them securely during deployment as Environment Variables.

Your application expects the following environment variables:

| Variable Name | Description | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Settings -> API inside Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase public anonymous key | Settings -> API inside Supabase |

---

## 2. Supabase Table Schema Requirements

Ensure that your database (`stoner4kt/ToursystemV1`) matches the structure expected by the INYATHI application. The application will fetch from, insert to, and update the following tables in Supabase:

### `profiles` (User and Driver Roles)
*   `driver_id` (Text, Primary Key) - Matches the format `DRV-XXXXXX`
*   `name` (Text) - Driver full name
*   `phone` (Text) - Driver phone number
*   `email` (Text, Unique) - Driver/Admin login email
*   `role` (Text) - Either `'admin'` or `'driver'`
*   `is_active` (Boolean) - `true` or `false`
*   `location` (Text) - Either `'Cape Town'` or `'Joburg'`

### `vehicles` (Fleet Inventory)
*   `registration_no` (Text, Primary Key) - e.g. `CA 123-456`
*   `make_model` (Text)
*   `current_mileage` (Integer/Numeric)
*   `location` (Text) - `'Cape Town'` or `'Joburg'`
*   `status` (Text) - `'Active'`, `'Maintenance'`, or `'Rented'`
*   `avatar_index` (Integer)

### `rented_vehicles` (External Fleet Rentals)
*   `id` (Text, Primary Key)
*   `company_name` (Text)
*   `registration_no` (Text)
*   `make_model` (Text)
*   `daily_rate` (Numeric)
*   `start_date` (Text/Timestamp)
*   `end_date` (Text/Timestamp)
*   `driver_id` (Text)

### `bookings` (Job and Scheduling Records)
*   `invoice_no` (Text, Primary Key) - e.g. `INV-1002`
*   `client_name` (Text)
*   `assigned_vehicle_reg` (Text)
*   `assigned_driver_id` (Text)
*   `start_date` (Text/Timestamp)
*   `end_date` (Text/Timestamp)
*   `color` (Text) - Accent hex color for calendar tracking lines
*   `location` (Text) - `'Cape Town'` or `'Joburg'`

### `inspections` (Vehicle Pre-Trip Forms)
*   `id` (Text, Primary Key)
*   `invoice_no` (Text)
*   `vehicle_reg` (Text)
*   `mileage_at_inspection` (Integer)
*   `is_license_disc_valid` (Boolean)
*   `windscreen_condition` (Text)
*   `exterior_notes` (Text)
*   `tire_notes` (Text)
*   `interior_cleanliness` (Text)
*   `has_spare_wheel` (Boolean)
*   `has_jack` (Boolean)
*   `has_spanner` (Boolean)
*   `engine_oil_status` (Text)
*   `coolant_status` (Text)
*   `remarks` (Text)
*   `created_at` (Text/Timestamp)

### `recons` (Driver Cost and Cash-Up Reconciliations)
*   `id` (Text, Primary Key)
*   `driver_id` (Text)
*   `start_date` (Text/Timestamp)
*   `end_date` (Text/Timestamp)
*   `received_cash` (Numeric)
*   `spent_cash` (Numeric)
*   `mileage_start` (Integer)
*   `mileage_end` (Integer)
*   `status` (Text) - `'draft'` or `'submitted'`
*   `edit_request_status` (Text) - `'pending'`, `'approved'`, or `'rejected'`

### `transfer_recons` (Inter-Driver Cash Transfers)
*   `id` (Text, Primary Key)
*   `driver_id` (Text)
*   `recipient_driver_id` (Text)
*   `amount` (Numeric)
*   `created_at` (Text/Timestamp)

### `expenses` (Fuel & Maintenance Expenses)
*   `id` (Text, Primary Key)
*   `vehicle_reg` (Text)
*   `category` (Text) - `'Fuel'` or `'Maintenance'`
*   `amount` (Numeric)
*   `odometer` (Integer)
*   `created_at` (Text/Timestamp)

### `fines` (Traffic Infringements)
*   `id` (Text, Primary Key)
*   `vehicle_reg` (Text)
*   `assigned_driver_id` (Text)
*   `amount` (Numeric)
*   `fine_timestamp` (Text/Timestamp)
*   `status` (Text) - `'unpaid'`, `'paid'`

### `incidents` (Accidents or Vehicle Damage)
*   `id` (Text, Primary Key)
*   `vehicle_reg` (Text)
*   `driver_id` (Text)
*   `description` (Text)
*   `created_at` (Text/Timestamp)

### `checklists` (Driver Multi-Point Forms)
*   `id` (Text, Primary Key)
*   `driver_id` (Text)
*   `vehicle_reg` (Text)
*   `items` (JSONB / Text)
*   `created_at` (Text/Timestamp)

### `delete_requests` (Booking Cancellation Requests)
*   `id` (Text, Primary Key)
*   `booking_id` (Text)
*   `requested_by` (Text)
*   `reason` (Text)
*   `status` (Text) - `'pending'`, `'approved'`, or `'rejected'`

---

## 3. Deploying to Vercel

Vercel has native support for Next.js and builds everything automatically:

1.  Push your code to a GitHub, GitLab, or Bitbucket repository.
2.  Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3.  Import your repository.
4.  Under **Environment Variables**, add:
    *   `NEXT_PUBLIC_SUPABASE_URL` = *(Your Supabase URL)*
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(Your Supabase Anon Key)*
5.  Click **"Deploy"**. Vercel will build and host your application securely.

---

## 4. Deploying to Netlify

To deploy on Netlify:

1.  Connect your code repository on [Netlify](https://netlify.com) by clicking **"Add new site"** -> **"Import an existing project"**.
2.  Set the build settings (Netlify will auto-detect Next.js App Router):
    *   **Build command:** `npm run build`
    *   **Publish directory:** `.next`
3.  In **Site configuration** -> **Environment variables**, add:
    *   `NEXT_PUBLIC_SUPABASE_URL` = *(Your Supabase URL)*
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(Your Supabase Anon Key)*
4.  Trigger the deploy. Netlify will build and host the application seamlessly.
