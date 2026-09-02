-- Run this once against an existing Supabase database if OTP deletion of
-- rental client / external driver profiles fails with:
-- "violates check constraint otp_verifications_resource_type_check".
--
-- The final schema already includes rental_client_delete, but existing
-- deployed databases need the old CHECK constraint replaced in place.
ALTER TABLE public.otp_verifications
  DROP CONSTRAINT IF EXISTS otp_verifications_resource_type_check;

ALTER TABLE public.otp_verifications
  ADD CONSTRAINT otp_verifications_resource_type_check
  CHECK (
    resource_type = ANY (
      ARRAY[
        'recon_edit'::text,
        'booking_edit'::text,
        'booking_delete'::text,
        'expense_approval'::text,
        'incident_delete'::text,
        'transfer_recon_edit'::text,
        'vehicle_delete'::text,
        'rented_vehicle_delete'::text,
        'driver_deactivate'::text,
        'rental_client_delete'::text
      ]
    )
  );
