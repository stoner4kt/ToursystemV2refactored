--
-- PostgreSQL database dump
--

\restrict HQOWOZ4Z2atEoN0ZWzTxKiPIdlKEZmuTmef0kRGIlhLZI5he0eXH6thnZo8aqUh

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: cleanup_expired_otps(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_otps() RETURNS void
    LANGUAGE plpgsql
    AS $$
                                                                                          BEGIN
                                                                                            DELETE FROM public.otp_verifications
                                                                                              WHERE expires_at < NOW() AND verified_at IS NULL;
                                                                                              END;
                                                                                              $$;


ALTER FUNCTION public.cleanup_expired_otps() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
  BEGIN
    INSERT INTO public.profiles (id, driver_id, name, role, email)
      VALUES (
          NEW.id,
              'DRV-' || UPPER(SUBSTRING(NEW.id::text, 1, 6)),
                  COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
                      COALESCE(NEW.raw_user_meta_data->>'role', 'driver'),
                          NEW.email
                            )
                              ON CONFLICT (id) DO UPDATE SET email = COALESCE(public.profiles.email, EXCLUDED.email);
                                RETURN NEW;
                                END;
                                $$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: hash_otp_code(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.hash_otp_code(plaintext text) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    AS $$
                                                                                -- Note: Supabase has pgcrypto, but bcrypt is external
                                                                                  -- Alternative: use crypt() if available, or implement in Edge Function
                                                                                    SELECT crypt(plaintext, gen_salt('bf', 10));
                                                                                    $$;


ALTER FUNCTION public.hash_otp_code(plaintext text) OWNER TO postgres;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
                                $$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- Name: lookup_driver_by_fine_time(text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lookup_driver_by_fine_time(p_vehicle_id text, p_fine_timestamp timestamp with time zone) RETURNS TABLE(booking_id uuid, driver_id text, driver_name text, driver_phone text, driver_email text, vehicle_reg text, invoice_no text, client_name text, rental_period tstzrange)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                                                                                                                                                                                                                                                                                             SELECT
                                                                                                                                                                                                                                                                                                                                 b.id,
                                                                                                                                                                                                                                                                                                                                     b.assigned_driver_id,
                                                                                                                                                                                                                                                                                                                                         p.name,
                                                                                                                                                                                                                                                                                                                                             p.phone,
                                                                                                                                                                                                                                                                                                                                                 p.email,
                                                                                                                                                                                                                                                                                                                                                     b.assigned_vehicle_reg,
                                                                                                                                                                                                                                                                                                                                                         b.invoice_no,
                                                                                                                                                                                                                                                                                                                                                             b.client_name,
                                                                                                                                                                                                                                                                                                                                                                 b.rental_period
                                                                                                                                                                                                                                                                                                                                                                   FROM public.bookings b
                                                                                                                                                                                                                                                                                                                                                                     LEFT JOIN public.profiles p ON p.driver_id = b.assigned_driver_id
                                                                                                                                                                                                                                                                                                                                                                       LEFT JOIN public.vehicles v ON v.registration_no = b.assigned_vehicle_reg
                                                                                                                                                                                                                                                                                                                                                                         WHERE public.is_admin()
                                                                                                                                                                                                                                                                                                                                                                             AND b.status <> 'cancelled'
                                                                                                                                                                                                                                                                                                                                                                                 AND b.assigned_driver_id IS NOT NULL
                                                                                                                                                                                                                                                                                                                                                                                     AND (b.assigned_vehicle_reg = p_vehicle_id OR v.id::text = p_vehicle_id)
                                                                                                                                                                                                                                                                                                                                                                                         AND b.rental_period @> p_fine_timestamp
                                                                                                                                                                                                                                                                                                                                                                                           ORDER BY lower(b.rental_period) DESC
                                                                                                                                                                                                                                                                                                                                                                                             LIMIT 1;
                                                                                                                                                                                                                                                                                                                                                                                             $$;


ALTER FUNCTION public.lookup_driver_by_fine_time(p_vehicle_id text, p_fine_timestamp timestamp with time zone) OWNER TO postgres;

--
-- Name: prevent_booking_vehicle_overlap(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_booking_vehicle_overlap() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
                                                                                                                                                                                                                                       BEGIN
                                                                                                                                                                                                                                         IF NEW.assigned_vehicle_reg IS NULL OR NEW.status = 'cancelled' THEN
                                                                                                                                                                                                                                             RETURN NEW;
                                                                                                                                                                                                                                               END IF;

                                                                                                                                                                                                                                                 IF EXISTS (
                                                                                                                                                                                                                                                     SELECT 1
                                                                                                                                                                                                                                                         FROM public.bookings existing
                                                                                                                                                                                                                                                             WHERE existing.id <> NEW.id
                                                                                                                                                                                                                                                                   AND existing.assigned_vehicle_reg = NEW.assigned_vehicle_reg
                                                                                                                                                                                                                                                                         AND existing.status <> 'cancelled'
                                                                                                                                                                                                                                                                               AND existing.rental_period && NEW.rental_period
                                                                                                                                                                                                                                                                                 ) THEN
                                                                                                                                                                                                                                                                                     RAISE EXCEPTION 'Vehicle % already has an overlapping booking in %',
                                                                                                                                                                                                                                                                                           NEW.assigned_vehicle_reg, NEW.rental_period;
                                                                                                                                                                                                                                                                                             END IF;

                                                                                                                                                                                                                                                                                               RETURN NEW;
                                                                                                                                                                                                                                                                                               END;
                                                                                                                                                                                                                                                                                               $$;


ALTER FUNCTION public.prevent_booking_vehicle_overlap() OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: set_booking_rental_period(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_booking_rental_period() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  computed_start TIMESTAMPTZ;
    computed_end   TIMESTAMPTZ;
    BEGIN
      -- If explicit timestamps are supplied, use them directly.
        -- Otherwise, interpret the DATE columns as Africa/Johannesburg wall-clock midnight.
          computed_start := COALESCE(
              NEW.start_time,
                  (NEW.start_date::text || ' 00:00:00')::timestamp AT TIME ZONE 'Africa/Johannesburg'
                    );

                      computed_end := COALESCE(
                          NEW.end_time,
                              -- End date is INCLUSIVE in the UI: extend to 23:59:59 SAST on that day.
                                  (NEW.end_date::text || ' 23:59:59')::timestamp AT TIME ZONE 'Africa/Johannesburg'
                                    );

                                      IF computed_start IS NULL THEN
                                          RAISE EXCEPTION 'Booking start_time/start_date is required to compute rental_period';
                                            END IF;

                                              IF computed_end <= computed_start THEN
                                                  RAISE EXCEPTION 'Booking end_time/end_date must be after start_time/start_date';
                                                    END IF;

                                                      NEW.start_time   := computed_start;
                                                        NEW.end_time     := computed_end;
                                                          -- Use closed-closed [) range: start inclusive, end exclusive (end+1 second).
                                                            NEW.rental_period := tstzrange(computed_start, computed_end + interval '1 second', '[)');
                                                              RETURN NEW;
                                                              END;
                                                              $$;


ALTER FUNCTION public.set_booking_rental_period() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: validate_traffic_fine(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_traffic_fine() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                                                                       DECLARE
                                                                                                                                                                                                                                                                                                                                                                                                                                         booking_record RECORD;
                                                                                                                                                                                                                                                                                                                                                                                                                                           driver_email TEXT;
                                                                                                                                                                                                                                                                                                                                                                                                                                           BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                                             SELECT * INTO booking_record
                                                                                                                                                                                                                                                                                                                                                                                                                                               FROM public.bookings
                                                                                                                                                                                                                                                                                                                                                                                                                                                 WHERE id = NEW.booking_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                   IF NOT FOUND THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                       RAISE EXCEPTION 'Booking % does not exist', NEW.booking_id;
                                                                                                                                                                                                                                                                                                                                                                                                                                                         END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                           IF NOT (booking_record.rental_period @> NEW.fine_timestamp) THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                               RAISE EXCEPTION 'Fine timestamp % is outside booking % rental period %',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                     NEW.fine_timestamp, NEW.booking_id, booking_record.rental_period;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                       END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                         IF booking_record.assigned_vehicle_reg IS DISTINCT FROM NEW.vehicle_reg
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              OR booking_record.assigned_driver_id IS DISTINCT FROM NEW.driver_id THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  RAISE EXCEPTION 'Fine vehicle/driver must match the selected booking';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      SELECT email INTO driver_email
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        FROM public.profiles
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          WHERE driver_id = NEW.driver_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            IF COALESCE(NULLIF(NEW.notification_email, ''), NULLIF(driver_email, '')) IS NULL THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                RAISE EXCEPTION 'At least one notification email is required: profile email or notification_email';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    NEW.notification_email := NULLIF(NEW.notification_email, '');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      NEW.logged_by_admin_id := COALESCE(NEW.logged_by_admin_id, auth.uid());
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        RETURN NEW;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        $$;


ALTER FUNCTION public.validate_traffic_fine() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: booking_delete_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.booking_delete_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    reason text NOT NULL,
    cancellation_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT booking_delete_requests_cancellation_type_check CHECK ((cancellation_type = ANY (ARRAY['mistake'::text, 'client_cancelled'::text]))),
    CONSTRAINT booking_delete_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.booking_delete_requests OWNER TO postgres;

--
-- Name: booking_edit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.booking_edit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    reason text NOT NULL,
    old_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    new_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    approved_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT booking_edit_log_action_check CHECK ((action = ANY (ARRAY['edit'::text, 'delete'::text])))
);


ALTER TABLE public.booking_edit_log OWNER TO postgres;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_no text NOT NULL,
    client_name text NOT NULL,
    tour_reference text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    assigned_driver_id text,
    assigned_vehicle_reg text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_status text DEFAULT 'unpaid'::text,
    is_locked boolean DEFAULT false,
    pre_trip_inspection_id uuid,
    post_trip_inspection_id uuid,
    completed_by uuid,
    completed_at timestamp with time zone,
    booking_documents jsonb DEFAULT '[]'::jsonb,
    receipt_number text,
    receipt_uploaded_at timestamp with time zone,
    itinerary_url text,
    itinerary_filename text,
    itinerary_uploaded_by uuid,
    itinerary_uploaded_at timestamp with time zone,
    locked_at timestamp with time zone,
    locked_reason text,
    last_modified_by uuid,
    last_modified_at timestamp with time zone,
    modification_reason text,
    maintenance_alert_sent boolean DEFAULT false,
    maintenance_alert_sent_at timestamp with time zone,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    rental_period tstzrange,
    is_rented_vehicle boolean DEFAULT false NOT NULL,
    rented_vehicle_id uuid,
    rented_vehicle_reg text,
    rented_vehicle_model text,
    location text DEFAULT 'Cape Town'::text NOT NULL,
    CONSTRAINT bookings_location_check CHECK ((location = ANY (ARRAY['Cape Town'::text, 'Joburg'::text]))),
    CONSTRAINT bookings_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'partially_paid'::text, 'paid'::text]))),
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['invoiced'::text, 'confirmed'::text, 'active'::text, 'in-transit'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: driver_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.driver_invites (
    email text NOT NULL,
    full_name text NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone,
    location text
);


ALTER TABLE public.driver_invites OWNER TO postgres;

--
-- Name: incident_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    driver_id text NOT NULL,
    vehicle_reg text NOT NULL,
    incident_date timestamp with time zone DEFAULT now() NOT NULL,
    incident_type text NOT NULL,
    description text NOT NULL,
    location text,
    injuries boolean DEFAULT false,
    police_report text,
    damage_photos jsonb DEFAULT '[]'::jsonb,
    pdf_url text,
    status text DEFAULT 'reported'::text,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    photo_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    document_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT incident_reports_incident_type_check CHECK ((incident_type = ANY (ARRAY['accident'::text, 'breakdown'::text, 'safety_issue'::text, 'damage'::text, 'injury'::text, 'other'::text]))),
    CONSTRAINT incident_reports_status_check CHECK ((status = ANY (ARRAY['reported'::text, 'reviewed'::text, 'resolved'::text, 'closed'::text])))
);


ALTER TABLE public.incident_reports OWNER TO postgres;

--
-- Name: inspections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_no text,
    vehicle_reg text NOT NULL,
    driver_id text NOT NULL,
    inspection_type text NOT NULL,
    checklist_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    faults_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    media_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    mileage_at_inspection integer,
    notes text,
    has_critical_fault boolean DEFAULT false NOT NULL,
    alert_sent boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    client_signature text,
    driver_signature text,
    submitted_at timestamp with time zone,
    pdf_urls jsonb DEFAULT '[]'::jsonb,
    is_rented_vehicle boolean DEFAULT false NOT NULL,
    rented_vehicle_model text,
    CONSTRAINT inspections_inspection_type_check CHECK ((inspection_type = ANY (ARRAY['pre-trip'::text, 'post-trip'::text])))
);


ALTER TABLE public.inspections OWNER TO postgres;

--
-- Name: otp_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid NOT NULL,
    otp_hash text NOT NULL,
    otp_plain text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    CONSTRAINT otp_verifications_resource_type_check CHECK ((resource_type = ANY (ARRAY['recon_edit'::text, 'booking_edit'::text, 'booking_delete'::text, 'expense_approval'::text, 'incident_delete'::text, 'transfer_recon_edit'::text])))
);


ALTER TABLE public.otp_verifications OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    driver_id text NOT NULL,
    name text NOT NULL,
    phone text,
    role text DEFAULT 'driver'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    location text DEFAULT 'Cape Town'::text NOT NULL,
    CONSTRAINT profiles_location_check CHECK ((location = ANY (ARRAY['Cape Town'::text, 'Joburg'::text]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['driver'::text, 'admin'::text])))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: recon_edit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recon_edit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recon_id uuid NOT NULL,
    driver_id text NOT NULL,
    admin_id uuid,
    action text NOT NULL,
    reason text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recon_edit_log_action_check CHECK ((action = ANY (ARRAY['request'::text, 'approve'::text, 'reject'::text])))
);


ALTER TABLE public.recon_edit_log OWNER TO postgres;

--
-- Name: recon_sheets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recon_sheets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id text NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    tour_reference text,
    tour_vehicle text,
    vehicle_reg text,
    start_km integer,
    end_km integer,
    total_distance_km integer DEFAULT 0,
    trips_completed integer DEFAULT 0,
    total_hours numeric(8,2),
    cost_lines_text text,
    trip_budget text,
    trip_cost text,
    driver_food text,
    flights_to text,
    flights_from text,
    driver_rate text,
    accommodation text,
    total_profit_loss text,
    director_sign_off text,
    vehicle_issues text,
    accidents_incidents text,
    traffic_violations text,
    safety_concerns text,
    maintenance_needed text,
    fuel_consumption text,
    tires_condition text,
    fatigue_level integer,
    stress_level integer,
    health_issues text,
    driver_notes text,
    admin_review_notes text,
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_at timestamp with time zone,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    edit_request_status text DEFAULT 'none'::text,
    edit_request_reason text,
    edit_request_fields jsonb DEFAULT '[]'::jsonb,
    edit_request_sent_at timestamp with time zone,
    edit_request_approved_by uuid,
    edit_request_approved_at timestamp with time zone,
    edit_request_rejected_reason text,
    edit_request_rejected_at timestamp with time zone,
    edit_request_rejection_reason text,
    slip_image_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT recon_sheets_edit_request_status_check CHECK ((edit_request_status = ANY (ARRAY['none'::text, 'pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT recon_sheets_fatigue_level_check CHECK (((fatigue_level >= 1) AND (fatigue_level <= 10))),
    CONSTRAINT recon_sheets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'reviewed'::text]))),
    CONSTRAINT recon_sheets_stress_level_check CHECK (((stress_level >= 1) AND (stress_level <= 10)))
);


ALTER TABLE public.recon_sheets OWNER TO postgres;

--
-- Name: rented_vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rented_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier text NOT NULL,
    reg_no text NOT NULL,
    make text,
    model text,
    start_date date,
    end_date date,
    daily_rate numeric(12,2),
    supplier_ref text,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_booking_id uuid,
    assigned_driver_id text
);


ALTER TABLE public.rented_vehicles OWNER TO postgres;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_config (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_config OWNER TO postgres;

--
-- Name: traffic_fines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.traffic_fines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    vehicle_reg text NOT NULL,
    driver_id text NOT NULL,
    fine_timestamp timestamp with time zone NOT NULL,
    fine_reference text,
    location text,
    description text,
    amount numeric(12,2),
    notification_email text,
    email_sent boolean DEFAULT false NOT NULL,
    email_sent_at timestamp with time zone,
    notification_error text,
    logged_by_admin_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT traffic_fines_amount_check CHECK (((amount IS NULL) OR (amount >= (0)::numeric))),
    CONSTRAINT traffic_fines_notification_email_format CHECK (((notification_email IS NULL) OR (notification_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'::text)))
);


ALTER TABLE public.traffic_fines OWNER TO postgres;

--
-- Name: transfer_recon_sheets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transfer_recon_sheets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id text NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    transfers jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_at timestamp with time zone,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    edit_request_status text DEFAULT 'none'::text,
    edit_request_reason text,
    edit_request_sent_at timestamp with time zone,
    edit_request_approved_by uuid,
    edit_request_approved_at timestamp with time zone,
    edit_request_rejection_reason text,
    CONSTRAINT transfer_recon_sheets_edit_request_status_check CHECK ((edit_request_status = ANY (ARRAY['none'::text, 'pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT transfer_recon_sheets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'reviewed'::text])))
);


ALTER TABLE public.transfer_recon_sheets OWNER TO postgres;

--
-- Name: vehicle_checklists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_reg text NOT NULL,
    driver_id text NOT NULL,
    checklist_date date NOT NULL,
    exterior text DEFAULT 'pending'::text,
    interior text DEFAULT 'pending'::text,
    mechanical text DEFAULT 'pending'::text,
    fluids text DEFAULT 'pending'::text,
    tires text DEFAULT 'pending'::text,
    brakes text DEFAULT 'pending'::text,
    lights text DEFAULT 'pending'::text,
    safety_gear text DEFAULT 'pending'::text,
    notes text,
    pdf_url text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vehicle_checklists_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'flagged'::text, 'approved'::text])))
);


ALTER TABLE public.vehicle_checklists OWNER TO postgres;

--
-- Name: vehicle_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_reg text NOT NULL,
    driver_id text,
    logged_by_admin_id uuid,
    expense_type text NOT NULL,
    description text,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    expense_date date NOT NULL,
    document_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    photo_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    alert_sent boolean DEFAULT false NOT NULL,
    driver_notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vehicle_expenses_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT vehicle_expenses_expense_type_check CHECK ((expense_type = ANY (ARRAY['Tyres'::text, 'Service'::text, 'Damage'::text, 'Repair'::text, 'Accident'::text, 'Other'::text]))),
    CONSTRAINT vehicle_expenses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.vehicle_expenses OWNER TO postgres;

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_no text NOT NULL,
    model text NOT NULL,
    make text,
    year integer,
    current_mileage integer DEFAULT 0 NOT NULL,
    next_service_km integer,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    assigned_driver_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    color text DEFAULT '#3498db'::text,
    location text DEFAULT 'Cape Town'::text NOT NULL,
    CONSTRAINT vehicles_location_check CHECK ((location = ANY (ARRAY['Cape Town'::text, 'Joburg'::text]))),
    CONSTRAINT vehicles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'maintenance'::text, 'decommissioned'::text])))
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Name: booking_delete_requests booking_delete_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_delete_requests
    ADD CONSTRAINT booking_delete_requests_pkey PRIMARY KEY (id);


--
-- Name: booking_edit_log booking_edit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_edit_log
    ADD CONSTRAINT booking_edit_log_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_invoice_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_invoice_no_key UNIQUE (invoice_no);


--
-- Name: bookings bookings_no_vehicle_rental_overlap; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_no_vehicle_rental_overlap EXCLUDE USING gist (assigned_vehicle_reg WITH =, rental_period WITH &&) WHERE (((assigned_vehicle_reg IS NOT NULL) AND (status <> 'cancelled'::text)));


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_receipt_number_key UNIQUE (receipt_number);


--
-- Name: driver_invites driver_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_invites
    ADD CONSTRAINT driver_invites_pkey PRIMARY KEY (email);


--
-- Name: incident_reports incident_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reports
    ADD CONSTRAINT incident_reports_pkey PRIMARY KEY (id);


--
-- Name: inspections inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_pkey PRIMARY KEY (id);


--
-- Name: otp_verifications otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_driver_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_driver_id_key UNIQUE (driver_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: recon_edit_log recon_edit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recon_edit_log
    ADD CONSTRAINT recon_edit_log_pkey PRIMARY KEY (id);


--
-- Name: recon_sheets recon_sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recon_sheets
    ADD CONSTRAINT recon_sheets_pkey PRIMARY KEY (id);


--
-- Name: rented_vehicles rented_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rented_vehicles
    ADD CONSTRAINT rented_vehicles_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (key);


--
-- Name: traffic_fines traffic_fines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traffic_fines
    ADD CONSTRAINT traffic_fines_pkey PRIMARY KEY (id);


--
-- Name: transfer_recon_sheets transfer_recon_sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_recon_sheets
    ADD CONSTRAINT transfer_recon_sheets_pkey PRIMARY KEY (id);


--
-- Name: vehicle_checklists vehicle_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_checklists
    ADD CONSTRAINT vehicle_checklists_pkey PRIMARY KEY (id);


--
-- Name: vehicle_expenses vehicle_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_registration_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_registration_no_key UNIQUE (registration_no);


--
-- Name: idx_booking_log_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_booking_log_admin ON public.booking_edit_log USING btree (admin_id);


--
-- Name: idx_booking_log_booking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_booking_log_booking ON public.booking_edit_log USING btree (booking_id);


--
-- Name: idx_booking_log_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_booking_log_date ON public.booking_edit_log USING btree (created_at DESC);


--
-- Name: idx_bookings_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_dates ON public.bookings USING btree (start_date, end_date);


--
-- Name: idx_bookings_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_driver ON public.bookings USING btree (assigned_driver_id);


--
-- Name: idx_bookings_is_rented; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_is_rented ON public.bookings USING btree (is_rented_vehicle) WHERE (is_rented_vehicle = true);


--
-- Name: idx_bookings_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_location ON public.bookings USING btree (location);


--
-- Name: idx_bookings_locked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_locked ON public.bookings USING btree (is_locked);


--
-- Name: idx_bookings_receipt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_receipt ON public.bookings USING btree (receipt_number);


--
-- Name: idx_bookings_rental_period_gist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_rental_period_gist ON public.bookings USING gist (rental_period);


--
-- Name: idx_bookings_rented_vehicle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_rented_vehicle_id ON public.bookings USING btree (rented_vehicle_id) WHERE (rented_vehicle_id IS NOT NULL);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_vehicle_rental_period_gist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_vehicle_rental_period_gist ON public.bookings USING gist (assigned_vehicle_reg, rental_period) WHERE ((assigned_vehicle_reg IS NOT NULL) AND (status <> 'cancelled'::text));


--
-- Name: idx_checklist_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklist_date ON public.vehicle_checklists USING btree (checklist_date DESC);


--
-- Name: idx_checklist_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklist_driver ON public.vehicle_checklists USING btree (driver_id);


--
-- Name: idx_checklist_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklist_status ON public.vehicle_checklists USING btree (status);


--
-- Name: idx_checklist_vehicle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklist_vehicle ON public.vehicle_checklists USING btree (vehicle_reg);


--
-- Name: idx_delete_requests_booking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delete_requests_booking ON public.booking_delete_requests USING btree (booking_id);


--
-- Name: idx_delete_requests_requester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delete_requests_requester ON public.booking_delete_requests USING btree (requested_by);


--
-- Name: idx_delete_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delete_requests_status ON public.booking_delete_requests USING btree (status);


--
-- Name: idx_expenses_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_created ON public.vehicle_expenses USING btree (created_at DESC);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_date ON public.vehicle_expenses USING btree (expense_date DESC);


--
-- Name: idx_expenses_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_driver ON public.vehicle_expenses USING btree (driver_id);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_status ON public.vehicle_expenses USING btree (status);


--
-- Name: idx_expenses_vehicle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_vehicle ON public.vehicle_expenses USING btree (vehicle_reg);


--
-- Name: idx_incident_booking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_booking ON public.incident_reports USING btree (booking_id);


--
-- Name: idx_incident_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_date ON public.incident_reports USING btree (incident_date DESC);


--
-- Name: idx_incident_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_driver ON public.incident_reports USING btree (driver_id);


--
-- Name: idx_incident_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_status ON public.incident_reports USING btree (status);


--
-- Name: idx_incident_vehicle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_vehicle ON public.incident_reports USING btree (vehicle_reg);


--
-- Name: idx_incidents_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_created ON public.incident_reports USING btree (created_at DESC);


--
-- Name: idx_incidents_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_driver ON public.incident_reports USING btree (driver_id);


--
-- Name: idx_incidents_vehicle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_vehicle ON public.incident_reports USING btree (vehicle_reg);


--
-- Name: idx_inspections_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inspections_date ON public.inspections USING btree (created_at DESC);


--
-- Name: idx_inspections_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inspections_driver ON public.inspections USING btree (driver_id);


--
-- Name: idx_inspections_fault; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inspections_fault ON public.inspections USING btree (has_critical_fault);


--
-- Name: idx_inspections_vehicle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inspections_vehicle ON public.inspections USING btree (vehicle_reg);


--
-- Name: idx_otp_admin_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otp_admin_active ON public.otp_verifications USING btree (admin_id, verified_at) WHERE (verified_at IS NULL);


--
-- Name: idx_otp_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otp_expires ON public.otp_verifications USING btree (expires_at);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_profiles_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_location ON public.profiles USING btree (location);


--
-- Name: idx_recon_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recon_driver ON public.recon_sheets USING btree (driver_id);


--
-- Name: idx_recon_edit_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recon_edit_status ON public.recon_sheets USING btree (edit_request_status);


--
-- Name: idx_recon_log_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recon_log_driver ON public.recon_edit_log USING btree (driver_id);


--
-- Name: idx_recon_log_recon; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recon_log_recon ON public.recon_edit_log USING btree (recon_id);


--
-- Name: idx_recon_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recon_status ON public.recon_sheets USING btree (status);


--
-- Name: idx_recon_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recon_week ON public.recon_sheets USING btree (week_start, week_end);


--
-- Name: idx_traffic_fines_booking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_traffic_fines_booking ON public.traffic_fines USING btree (booking_id);


--
-- Name: idx_traffic_fines_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_traffic_fines_created ON public.traffic_fines USING btree (created_at DESC);


--
-- Name: idx_traffic_fines_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_traffic_fines_driver ON public.traffic_fines USING btree (driver_id);


--
-- Name: idx_traffic_fines_vehicle_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_traffic_fines_vehicle_time ON public.traffic_fines USING btree (vehicle_reg, fine_timestamp DESC);


--
-- Name: idx_transfer_recon_driver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfer_recon_driver ON public.transfer_recon_sheets USING btree (driver_id);


--
-- Name: idx_transfer_recon_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfer_recon_status ON public.transfer_recon_sheets USING btree (status);


--
-- Name: idx_transfer_recon_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfer_recon_week ON public.transfer_recon_sheets USING btree (week_start, week_end);


--
-- Name: idx_vehicles_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vehicles_location ON public.vehicles USING btree (location);


--
-- Name: bookings trg_bookings_modified_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bookings_modified_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bookings trg_bookings_rental_period; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bookings_rental_period BEFORE INSERT OR UPDATE OF start_date, end_date, start_time, end_time ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_rental_period();


--
-- Name: bookings trg_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: vehicle_checklists trg_checklist_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_checklist_updated_at BEFORE UPDATE ON public.vehicle_checklists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: vehicle_expenses trg_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.vehicle_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: incident_reports trg_incident_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_incident_updated_at BEFORE UPDATE ON public.incident_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: incident_reports trg_incidents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_incidents_updated_at BEFORE UPDATE ON public.incident_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bookings trg_prevent_booking_vehicle_overlap; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_booking_vehicle_overlap BEFORE INSERT OR UPDATE OF assigned_vehicle_reg, rental_period, status, start_date, end_date, start_time, end_time ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_vehicle_overlap();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: recon_sheets trg_recon_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_recon_updated_at BEFORE UPDATE ON public.recon_sheets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: traffic_fines trg_traffic_fines_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_traffic_fines_updated_at BEFORE UPDATE ON public.traffic_fines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: transfer_recon_sheets trg_transfer_recon_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_transfer_recon_updated_at BEFORE UPDATE ON public.transfer_recon_sheets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: traffic_fines trg_validate_traffic_fine; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_traffic_fine BEFORE INSERT OR UPDATE OF booking_id, vehicle_reg, driver_id, fine_timestamp, notification_email ON public.traffic_fines FOR EACH ROW EXECUTE FUNCTION public.validate_traffic_fine();


--
-- Name: vehicles trg_vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: booking_delete_requests booking_delete_requests_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_delete_requests
    ADD CONSTRAINT booking_delete_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_delete_requests booking_delete_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_delete_requests
    ADD CONSTRAINT booking_delete_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id);


--
-- Name: booking_delete_requests booking_delete_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_delete_requests
    ADD CONSTRAINT booking_delete_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: booking_edit_log booking_edit_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_edit_log
    ADD CONSTRAINT booking_edit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: booking_edit_log booking_edit_log_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_edit_log
    ADD CONSTRAINT booking_edit_log_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_assigned_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_assigned_driver_id_fkey FOREIGN KEY (assigned_driver_id) REFERENCES public.profiles(driver_id) ON DELETE SET NULL;


--
-- Name: bookings bookings_assigned_vehicle_reg_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_assigned_vehicle_reg_fkey FOREIGN KEY (assigned_vehicle_reg) REFERENCES public.vehicles(registration_no) ON DELETE SET NULL;


--
-- Name: bookings bookings_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_itinerary_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_itinerary_uploaded_by_fkey FOREIGN KEY (itinerary_uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_last_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_post_trip_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_post_trip_inspection_id_fkey FOREIGN KEY (post_trip_inspection_id) REFERENCES public.inspections(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_pre_trip_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pre_trip_inspection_id_fkey FOREIGN KEY (pre_trip_inspection_id) REFERENCES public.inspections(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_rented_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_rented_vehicle_id_fkey FOREIGN KEY (rented_vehicle_id) REFERENCES public.rented_vehicles(id) ON DELETE SET NULL;


--
-- Name: driver_invites driver_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_invites
    ADD CONSTRAINT driver_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);


--
-- Name: inspections fk_inspections_vehicles; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT fk_inspections_vehicles FOREIGN KEY (vehicle_reg) REFERENCES public.vehicles(registration_no) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incident_reports incident_reports_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reports
    ADD CONSTRAINT incident_reports_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: incident_reports incident_reports_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reports
    ADD CONSTRAINT incident_reports_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(driver_id) ON DELETE CASCADE;


--
-- Name: incident_reports incident_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reports
    ADD CONSTRAINT incident_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: incident_reports incident_reports_vehicle_reg_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_reports
    ADD CONSTRAINT incident_reports_vehicle_reg_fkey FOREIGN KEY (vehicle_reg) REFERENCES public.vehicles(registration_no) ON DELETE CASCADE;


--
-- Name: inspections inspections_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(driver_id);


--
-- Name: otp_verifications otp_verifications_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recon_edit_log recon_edit_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recon_edit_log
    ADD CONSTRAINT recon_edit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: recon_edit_log recon_edit_log_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recon_edit_log
    ADD CONSTRAINT recon_edit_log_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(driver_id) ON DELETE SET NULL;


--
-- Name: recon_edit_log recon_edit_log_recon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recon_edit_log
    ADD CONSTRAINT recon_edit_log_recon_id_fkey FOREIGN KEY (recon_id) REFERENCES public.recon_sheets(id) ON DELETE CASCADE;


--
-- Name: recon_sheets recon_sheets_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recon_sheets
    ADD CONSTRAINT recon_sheets_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(driver_id);


--
-- Name: recon_sheets recon_sheets_edit_request_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recon_sheets
    ADD CONSTRAINT recon_sheets_edit_request_approved_by_fkey FOREIGN KEY (edit_request_approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: recon_sheets recon_sheets_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recon_sheets
    ADD CONSTRAINT recon_sheets_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: rented_vehicles rented_vehicles_assigned_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rented_vehicles
    ADD CONSTRAINT rented_vehicles_assigned_booking_id_fkey FOREIGN KEY (assigned_booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: rented_vehicles rented_vehicles_assigned_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rented_vehicles
    ADD CONSTRAINT rented_vehicles_assigned_driver_id_fkey FOREIGN KEY (assigned_driver_id) REFERENCES public.profiles(driver_id) ON DELETE SET NULL;


--
-- Name: traffic_fines traffic_fines_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traffic_fines
    ADD CONSTRAINT traffic_fines_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;


--
-- Name: traffic_fines traffic_fines_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traffic_fines
    ADD CONSTRAINT traffic_fines_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(driver_id) ON DELETE RESTRICT;


--
-- Name: traffic_fines traffic_fines_logged_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traffic_fines
    ADD CONSTRAINT traffic_fines_logged_by_admin_id_fkey FOREIGN KEY (logged_by_admin_id) REFERENCES public.profiles(id);


--
-- Name: traffic_fines traffic_fines_vehicle_reg_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traffic_fines
    ADD CONSTRAINT traffic_fines_vehicle_reg_fkey FOREIGN KEY (vehicle_reg) REFERENCES public.vehicles(registration_no) ON DELETE RESTRICT;


--
-- Name: transfer_recon_sheets transfer_recon_sheets_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_recon_sheets
    ADD CONSTRAINT transfer_recon_sheets_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(driver_id);


--
-- Name: transfer_recon_sheets transfer_recon_sheets_edit_request_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_recon_sheets
    ADD CONSTRAINT transfer_recon_sheets_edit_request_approved_by_fkey FOREIGN KEY (edit_request_approved_by) REFERENCES public.profiles(id);


--
-- Name: transfer_recon_sheets transfer_recon_sheets_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_recon_sheets
    ADD CONSTRAINT transfer_recon_sheets_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: vehicle_checklists vehicle_checklists_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_checklists
    ADD CONSTRAINT vehicle_checklists_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(driver_id) ON DELETE CASCADE;


--
-- Name: vehicle_checklists vehicle_checklists_vehicle_reg_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_checklists
    ADD CONSTRAINT vehicle_checklists_vehicle_reg_fkey FOREIGN KEY (vehicle_reg) REFERENCES public.vehicles(registration_no) ON DELETE CASCADE;


--
-- Name: vehicle_expenses vehicle_expenses_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(driver_id);


--
-- Name: vehicle_expenses vehicle_expenses_logged_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_logged_by_admin_id_fkey FOREIGN KEY (logged_by_admin_id) REFERENCES public.profiles(id);


--
-- Name: vehicle_expenses vehicle_expenses_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: vehicle_expenses vehicle_expenses_vehicle_reg_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_vehicle_reg_fkey FOREIGN KEY (vehicle_reg) REFERENCES public.vehicles(registration_no) ON DELETE RESTRICT;


--
-- Name: vehicles vehicles_assigned_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_assigned_driver_id_fkey FOREIGN KEY (assigned_driver_id) REFERENCES public.profiles(driver_id) ON DELETE SET NULL;


--
-- Name: bookings Admins can create bookings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: bookings Admins can update bookings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: booking_delete_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.booking_delete_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_edit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.booking_edit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_edit_log booking_log_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY booking_log_admin ON public.booking_edit_log FOR SELECT USING (public.is_admin());


--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings bookings_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY bookings_admin_all ON public.bookings USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: bookings bookings_authenticated_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY bookings_authenticated_read ON public.bookings FOR SELECT TO authenticated USING (true);


--
-- Name: bookings bookings_driver_read_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY bookings_driver_read_own ON public.bookings FOR SELECT USING ((assigned_driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: vehicle_checklists checklist_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY checklist_admin ON public.vehicle_checklists TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: vehicle_checklists checklist_own_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY checklist_own_insert ON public.vehicle_checklists FOR INSERT TO authenticated WITH CHECK ((driver_id = ( SELECT p.driver_id
   FROM public.profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: vehicle_checklists checklist_own_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY checklist_own_select ON public.vehicle_checklists FOR SELECT TO authenticated USING ((driver_id = ( SELECT p.driver_id
   FROM public.profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: vehicle_checklists checklist_own_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY checklist_own_update ON public.vehicle_checklists FOR UPDATE TO authenticated USING ((driver_id = ( SELECT p.driver_id
   FROM public.profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid))))) WITH CHECK ((driver_id = ( SELECT p.driver_id
   FROM public.profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: booking_delete_requests delete_requests_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY delete_requests_admin ON public.booking_delete_requests USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: driver_invites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.driver_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_invites driver_invites_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY driver_invites_admin ON public.driver_invites USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: vehicle_expenses expenses_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY expenses_admin_all ON public.vehicle_expenses USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: vehicle_expenses expenses_driver_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY expenses_driver_insert ON public.vehicle_expenses FOR INSERT WITH CHECK ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: vehicle_expenses expenses_driver_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY expenses_driver_select ON public.vehicle_expenses FOR SELECT USING ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: incident_reports incident_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incident_admin ON public.incident_reports TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: incident_reports incident_own_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incident_own_insert ON public.incident_reports FOR INSERT TO authenticated WITH CHECK ((driver_id = ( SELECT p.driver_id
   FROM public.profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: incident_reports incident_own_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incident_own_select ON public.incident_reports FOR SELECT TO authenticated USING ((driver_id = ( SELECT p.driver_id
   FROM public.profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: incident_reports incident_own_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incident_own_update ON public.incident_reports FOR UPDATE TO authenticated USING ((driver_id = ( SELECT p.driver_id
   FROM public.profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid))))) WITH CHECK ((driver_id = ( SELECT p.driver_id
   FROM public.profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: incident_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: incident_reports incidents_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incidents_admin_all ON public.incident_reports USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: incident_reports incidents_driver_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incidents_driver_insert ON public.incident_reports FOR INSERT WITH CHECK ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: incident_reports incidents_driver_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incidents_driver_select ON public.incident_reports FOR SELECT USING ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: inspections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

--
-- Name: inspections inspections_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inspections_admin ON public.inspections USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: inspections inspections_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inspections_insert ON public.inspections FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: inspections inspections_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inspections_own ON public.inspections FOR SELECT USING ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: otp_verifications otp_admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY otp_admin_only ON public.otp_verifications USING (((admin_id = auth.uid()) OR public.is_admin())) WITH CHECK (public.is_admin());


--
-- Name: otp_verifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_admin ON public.profiles USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: profiles profiles_self_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: recon_sheets recon_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recon_admin ON public.recon_sheets USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: recon_edit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.recon_edit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: recon_edit_log recon_log_driver; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recon_log_driver ON public.recon_edit_log FOR SELECT USING (((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR public.is_admin()));


--
-- Name: recon_sheets recon_own_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recon_own_insert ON public.recon_sheets FOR INSERT WITH CHECK ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: recon_sheets recon_own_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recon_own_select ON public.recon_sheets FOR SELECT USING ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: recon_sheets recon_own_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recon_own_update ON public.recon_sheets FOR UPDATE USING ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))) WITH CHECK ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: recon_sheets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.recon_sheets ENABLE ROW LEVEL SECURITY;

--
-- Name: rented_vehicles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rented_vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: rented_vehicles rented_vehicles_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rented_vehicles_admin_all ON public.rented_vehicles TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: system_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

--
-- Name: traffic_fines; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.traffic_fines ENABLE ROW LEVEL SECURITY;

--
-- Name: traffic_fines traffic_fines_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY traffic_fines_admin_all ON public.traffic_fines USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: traffic_fines traffic_fines_driver_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY traffic_fines_driver_select ON public.traffic_fines FOR SELECT USING ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transfer_recon_sheets transfer_recon_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY transfer_recon_admin ON public.transfer_recon_sheets USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: transfer_recon_sheets transfer_recon_own_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY transfer_recon_own_insert ON public.transfer_recon_sheets FOR INSERT WITH CHECK ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transfer_recon_sheets transfer_recon_own_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY transfer_recon_own_select ON public.transfer_recon_sheets FOR SELECT USING ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transfer_recon_sheets transfer_recon_own_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY transfer_recon_own_update ON public.transfer_recon_sheets FOR UPDATE USING ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))) WITH CHECK ((driver_id = ( SELECT profiles.driver_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transfer_recon_sheets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.transfer_recon_sheets ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_checklists; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.vehicle_checklists ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles vehicles_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY vehicles_admin ON public.vehicles USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: vehicles vehicles_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY vehicles_read ON public.vehicles FOR SELECT TO authenticated USING (true);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION cleanup_expired_otps(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_expired_otps() TO anon;
GRANT ALL ON FUNCTION public.cleanup_expired_otps() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_expired_otps() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION hash_otp_code(plaintext text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hash_otp_code(plaintext text) TO anon;
GRANT ALL ON FUNCTION public.hash_otp_code(plaintext text) TO authenticated;
GRANT ALL ON FUNCTION public.hash_otp_code(plaintext text) TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION lookup_driver_by_fine_time(p_vehicle_id text, p_fine_timestamp timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.lookup_driver_by_fine_time(p_vehicle_id text, p_fine_timestamp timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.lookup_driver_by_fine_time(p_vehicle_id text, p_fine_timestamp timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.lookup_driver_by_fine_time(p_vehicle_id text, p_fine_timestamp timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.lookup_driver_by_fine_time(p_vehicle_id text, p_fine_timestamp timestamp with time zone) TO service_role;


--
-- Name: FUNCTION prevent_booking_vehicle_overlap(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_booking_vehicle_overlap() TO anon;
GRANT ALL ON FUNCTION public.prevent_booking_vehicle_overlap() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_booking_vehicle_overlap() TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION set_booking_rental_period(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_booking_rental_period() TO anon;
GRANT ALL ON FUNCTION public.set_booking_rental_period() TO authenticated;
GRANT ALL ON FUNCTION public.set_booking_rental_period() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION validate_traffic_fine(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_traffic_fine() TO anon;
GRANT ALL ON FUNCTION public.validate_traffic_fine() TO authenticated;
GRANT ALL ON FUNCTION public.validate_traffic_fine() TO service_role;


--
-- Name: TABLE booking_delete_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.booking_delete_requests TO anon;
GRANT ALL ON TABLE public.booking_delete_requests TO authenticated;
GRANT ALL ON TABLE public.booking_delete_requests TO service_role;


--
-- Name: TABLE booking_edit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.booking_edit_log TO anon;
GRANT ALL ON TABLE public.booking_edit_log TO authenticated;
GRANT ALL ON TABLE public.booking_edit_log TO service_role;


--
-- Name: TABLE bookings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bookings TO anon;
GRANT ALL ON TABLE public.bookings TO authenticated;
GRANT ALL ON TABLE public.bookings TO service_role;


--
-- Name: TABLE driver_invites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.driver_invites TO anon;
GRANT ALL ON TABLE public.driver_invites TO authenticated;
GRANT ALL ON TABLE public.driver_invites TO service_role;


--
-- Name: TABLE incident_reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.incident_reports TO anon;
GRANT ALL ON TABLE public.incident_reports TO authenticated;
GRANT ALL ON TABLE public.incident_reports TO service_role;


--
-- Name: TABLE inspections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inspections TO anon;
GRANT ALL ON TABLE public.inspections TO authenticated;
GRANT ALL ON TABLE public.inspections TO service_role;


--
-- Name: TABLE otp_verifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.otp_verifications TO anon;
GRANT ALL ON TABLE public.otp_verifications TO authenticated;
GRANT ALL ON TABLE public.otp_verifications TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE recon_edit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.recon_edit_log TO anon;
GRANT ALL ON TABLE public.recon_edit_log TO authenticated;
GRANT ALL ON TABLE public.recon_edit_log TO service_role;


--
-- Name: TABLE recon_sheets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.recon_sheets TO anon;
GRANT ALL ON TABLE public.recon_sheets TO authenticated;
GRANT ALL ON TABLE public.recon_sheets TO service_role;


--
-- Name: TABLE rented_vehicles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rented_vehicles TO anon;
GRANT ALL ON TABLE public.rented_vehicles TO authenticated;
GRANT ALL ON TABLE public.rented_vehicles TO service_role;


--
-- Name: TABLE system_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_config TO anon;
GRANT ALL ON TABLE public.system_config TO authenticated;
GRANT ALL ON TABLE public.system_config TO service_role;


--
-- Name: TABLE traffic_fines; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.traffic_fines TO anon;
GRANT ALL ON TABLE public.traffic_fines TO authenticated;
GRANT ALL ON TABLE public.traffic_fines TO service_role;


--
-- Name: TABLE transfer_recon_sheets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.transfer_recon_sheets TO anon;
GRANT ALL ON TABLE public.transfer_recon_sheets TO authenticated;
GRANT ALL ON TABLE public.transfer_recon_sheets TO service_role;


--
-- Name: TABLE vehicle_checklists; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vehicle_checklists TO anon;
GRANT ALL ON TABLE public.vehicle_checklists TO authenticated;
GRANT ALL ON TABLE public.vehicle_checklists TO service_role;


--
-- Name: TABLE vehicle_expenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vehicle_expenses TO anon;
GRANT ALL ON TABLE public.vehicle_expenses TO authenticated;
GRANT ALL ON TABLE public.vehicle_expenses TO service_role;


--
-- Name: TABLE vehicles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vehicles TO anon;
GRANT ALL ON TABLE public.vehicles TO authenticated;
GRANT ALL ON TABLE public.vehicles TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict HQOWOZ4Z2atEoN0ZWzTxKiPIdlKEZmuTmef0kRGIlhLZI5he0eXH6thnZo8aqUh

