-- Remove duplicate admin policies on bookings table.
-- bookings_admin_all already covers INSERT and UPDATE for admins.
DROP POLICY IF EXISTS "Admins can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;