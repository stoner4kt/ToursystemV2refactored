'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, ClipboardCheck, Car, Users, Landmark, AlertOctagon, Info, FileText, 
  Settings, LogOut, Check, X, ShieldCheck, MapPin, Plus, Trash2, Download, AlertTriangle, Eye, RefreshCw, FileUp, CheckCircle
} from 'lucide-react';
import { 
  Profile, Vehicle, Booking, Inspection, ReconSheet, TransferReconSheet, RentedVehicle, BookingDeleteRequest,
  VehicleExpense, TrafficFine, IncidentReport, BookingEditLog, VehicleChecklist,
  bookingsApi, fleetApi, driversApi, inspectionsApi, reconApi, transferReconApi, expensesApi, trafficFinesApi, incidentsApi, checklistsApi, authApi,
  downloadCSV, uploadToCloudinary, getSignedUrlForView
} from '@/lib/storage';
import CalendarGrid from './CalendarGrid';
import OTPModal from './OTPModal';
import { downloadInspectionPDF, downloadReconPDF, downloadTransferReconPDF, downloadChecklistPDF } from '@/lib/pdf';

interface AdminDashboardProps {
  admin: Profile;
  onLogout: () => void;
}

export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'fleet' | 'rented' | 'drivers' | 'recons' | 'transfers' | 'wages' | 'fines' | 'expenses' | 'incidents' | 'settings'>('dashboard');
  const [region, setRegion] = useState<'Cape Town' | 'Joburg'>('Cape Town');
  const [otpEnabled, setOtpEnabled] = useState(false);

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentedVehicles, setRentedVehicles] = useState<RentedVehicle[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [driverInvites, setDriverInvites] = useState<any[]>([]);
  const [weeklyRecons, setWeeklyRecons] = useState<ReconSheet[]>([]);
  const [transferRecons, setTransferRecons] = useState<TransferReconSheet[]>([]);
  const [trafficFines, setTrafficFines] = useState<TrafficFine[]>([]);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [deleteRequests, setDeleteRequests] = useState<BookingDeleteRequest[]>([]);

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpActionType, setOtpActionType] = useState<string>('');
  const [otpTargetId, setOtpTargetId] = useState<string>('');
  const [otpCallback, setOtpCallback] = useState<(() => void) | null>(null);

  // Booking Modal Form State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState<Partial<Booking>>({
    invoice_no: '', client_name: '', route: '', tour_reference: '',
    start_date: '',
    end_date: '',
    assigned_driver_id: '', assigned_vehicle_reg: '', status: 'pending',
    payment_status: 'unpaid', receipt_number: '', booking_documents: [], is_rented_vehicle: false,
    rented_vehicle_id: '', rented_vehicle_reg: '', rented_vehicle_model: '', notes: ''
  });
  const [editReason, setEditReason] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadingBookingDoc, setUploadingBookingDoc] = useState(false);
  const [uploadingItinerary, setUploadingItinerary] = useState(false);

  // General Admin Modals / Form entries
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({
    registration_no: '', make: '', model: '', year: 2023, current_mileage: 0,
    next_service_km: 10000, status: 'active', color: '#14b8a6', notes: ''
  });

  const [showRentedModal, setShowRentedModal] = useState(false);
  const [rentedForm, setRentedForm] = useState<Partial<RentedVehicle>>({
    supplier: '', reg_no: '', make: '', model: '', start_date: '',
    end_date: '',
    daily_rate: 1500, supplier_ref: '', status: 'active', notes: ''
  });

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  // Fine form State
  const [fineForm, setFineForm] = useState({
    vehicle_reg: '', fine_timestamp: '',
    fine_reference: '', location: '', description: '', amount: '', notification_email: '',
    status: 'pending' as 'paid' | 'pending'
  });
  const [fineAutofilledDriver, setFineAutofilledDriver] = useState<{ driverId: string; name: string; bookingId: string } | null>(null);

  // Wages compilation filters
  const [wageStartDate, setWageStartDate] = useState('');
  const [wageEndDate, setWageEndDate] = useState('');

  const refreshData = useCallback(() => {
    setBookings(bookingsApi.getBookings(region));
    setVehicles(fleetApi.getVehicles(region));
    setRentedVehicles(fleetApi.getRentedVehicles());
    setDrivers(driversApi.getDrivers(region));
    setDriverInvites(driversApi.getInvites());
    setWeeklyRecons(reconApi.getRecons());
    setTransferRecons(transferReconApi.getRecons());
    setTrafficFines(trafficFinesApi.getFines());
    setVehicleExpenses(expensesApi.getExpenses());
    setIncidentReports(incidentsApi.getIncidents());
    setInspections(inspectionsApi.getInspections(region));
    setChecklists(checklistsApi.getChecklists());
    setDeleteRequests(bookingsApi.getDeleteRequests());
  }, [region]);

  // Init & refresh
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshData();
      setOtpEnabled(authApi.getOtpEnabled());

      // Safely and purely initialize default form dates on client side
      const todayStr = new Date().toISOString().substring(0, 10);
      const startDateTimeStr = new Date().toISOString().substring(0, 16);
      const endDateTimeStr = new Date(new Date().getTime() + 24 * 3600 * 1000).toISOString().substring(0, 16);
      const rentedEndStr = new Date(new Date().getTime() + 5 * 24 * 3600 * 1000).toISOString().substring(0, 10);
      const wageStartStr = new Date(new Date().getTime() - 30 * 24 * 3600 * 1000).toISOString().substring(0, 10);

      setBookingForm(prev => ({
        ...prev,
        start_date: startDateTimeStr,
        end_date: endDateTimeStr
      }));

      setRentedForm(prev => ({
        ...prev,
        start_date: todayStr,
        end_date: rentedEndStr
      }));

      setFineForm(prev => ({
        ...prev,
        fine_timestamp: startDateTimeStr
      }));

      setWageStartDate(wageStartStr);
      setWageEndDate(todayStr);
    }, 0);

    return () => clearTimeout(timer);
  }, [region, refreshData]);

  const handleRegionSwitch = (newRegion: 'Cape Town' | 'Joburg') => {
    setRegion(newRegion);
  };

  // Perform action with OTP Guard if enabled
  const executeWithOtpGuard = (actionType: string, id: string, onAuthorized: () => void, description?: string) => {
    if (otpEnabled) {
      setOtpActionType(actionType);
      setOtpTargetId(id);
      setOtpCallback(() => onAuthorized);
      setShowOtpModal(true);
    } else {
      const confirmAction = window.confirm(`Authorize action: ${actionType}?`);
      if (confirmAction) onAuthorized();
    }
  };

  const handleOtpSuccess = () => {
    setShowOtpModal(false);
    if (otpCallback) otpCallback();
    setOtpCallback(null);
    alert('🔐 Action successfully verified and authorized!');
  };

  // BOOKING HANDLERS
  const handleOpenNewBooking = (date?: Date) => {
    const startStr = date 
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0).toISOString().substring(0, 16)
      : new Date().toISOString().substring(0, 16);
    const endStr = date
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0).toISOString().substring(0, 16)
      : new Date(Date.now() + 24 * 3600 * 1000).toISOString().substring(0, 16);

    setBookingForm({
      invoice_no: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      client_name: '', route: '', tour_reference: '', start_date: startStr, end_date: endStr,
      assigned_driver_id: drivers[0]?.driver_id || '', assigned_vehicle_reg: vehicles[0]?.registration_no || '',
      status: 'pending', payment_status: 'unpaid', receipt_number: '', booking_documents: [],
      is_rented_vehicle: false, rented_vehicle_id: '', rented_vehicle_reg: '', rented_vehicle_model: '', notes: ''
    });
    setEditReason('');
    setIsEditMode(false);
    setShowBookingModal(true);
  };

  const handleOpenEditBooking = (b: Booking) => {
    setBookingForm({
      ...b,
      start_date: new Date(b.start_date).toISOString().substring(0, 16),
      end_date: new Date(b.end_date).toISOString().substring(0, 16)
    });
    setEditReason('');
    setIsEditMode(true);
    setShowBookingModal(true);
  };

  const handleBookingDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBookingDoc(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'booking-documents');
      const newDoc = {
        id: `DOC-${Date.now()}`,
        url: uploadResult.url,
        public_id: uploadResult.public_id,
        resource_type: uploadResult.resource_type,
        filename: file.name,
        size: file.size,
        uploaded_at: new Date().toISOString()
      };
      setBookingForm(prev => ({
        ...prev,
        booking_documents: [...(prev.booking_documents || []), newDoc]
      }));
      alert("✅ Booking document uploaded to Cloudinary!");
    } catch (err) {
      alert("Failed to upload booking document");
    } finally {
      setUploadingBookingDoc(false);
    }
  };

  const handleItineraryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingItinerary(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'booking-itinerary');
      setBookingForm(prev => ({
        ...prev,
        itinerary_url: JSON.stringify({
          public_id: uploadResult.public_id,
          resource_type: uploadResult.resource_type,
          filename: file.name,
          url: uploadResult.url
        }),
        itinerary_filename: file.name,
        itinerary_uploaded_at: new Date().toISOString()
      }));
      alert("✅ Itinerary uploaded to Cloudinary!");
    } catch (err) {
      alert("Failed to upload itinerary");
    } finally {
      setUploadingItinerary(false);
    }
  };

  const saveBooking = () => {
    if (!bookingForm.invoice_no || !bookingForm.client_name || !bookingForm.route) {
      alert('Please complete all core booking details.');
      return;
    }

    const payload: Booking = {
      ...(bookingForm as Booking),
      start_date: new Date(bookingForm.start_date || '').toISOString(),
      end_date: new Date(bookingForm.end_date || '').toISOString(),
      location: region,
      updated_at: new Date().toISOString()
    };

    const action = () => {
      bookingsApi.saveBooking(payload, admin.driver_id, editReason || 'Details modified');
      setShowBookingModal(false);
      refreshData();
      alert('Booking saved and schedules compiled!');
    };

    if (isEditMode && (bookingForm.status === 'completed' || bookingForm.status === 'confirmed')) {
      executeWithOtpGuard('booking_edit', bookingForm.invoice_no || '', action, 'Administrative clearance is required to update a locked or completed booking schedule.');
    } else {
      action();
    }
  };

  const requestBookingDelete = (bookingId: string) => {
    const reason = prompt('Please enter the cancellation reason:');
    if (!reason) return;
    
    const cancellationType = window.confirm('Is this a mistake? (Click OK for Mistake, Cancel for Client Cancelled)') 
      ? 'mistake' : 'client_cancelled';

    bookingsApi.requestDelete(bookingId, admin.name, reason, cancellationType);
    refreshData();
    alert('🔴 Deletion request submitted and locked. Awaiting administrative review in "Pending Deletions" tab.');
  };

  // FLEET HANDLERS
  const saveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.registration_no || !vehicleForm.model) return;

    const payload: Vehicle = {
      ...(vehicleForm as Vehicle),
      location: region,
      created_at: vehicleForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    fleetApi.saveVehicle(payload);
    setShowVehicleModal(false);
    refreshData();
    alert('Vehicle schedule updated.');
  };

  const deleteVehicle = (regNo: string) => {
    if (confirm(`Remove vehicle ${regNo} from owned fleet list?`)) {
      fleetApi.deleteVehicle(regNo);
      refreshData();
    }
  };

  // RENTED HANDLERS
  const saveRented = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentedForm.supplier || !rentedForm.reg_no) return;

    const payload: RentedVehicle = {
      ...(rentedForm as RentedVehicle),
      id: rentedForm.id || `rv-${Math.random().toString(36).substring(2, 9)}`,
      created_at: rentedForm.created_at || new Date().toISOString()
    };

    fleetApi.saveRentedVehicle(payload);
    setShowRentedModal(false);
    refreshData();
  };

  // DRIVERS & INVITE HANDLERS
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    driversApi.createInvite({
      email: inviteEmail,
      full_name: inviteName,
      location: region,
      invited_by: admin.driver_id,
      invited_at: new Date().toISOString()
    });

    setInviteEmail('');
    setInviteName('');
    refreshData();
    alert(`✉️ Invitation voucher successfully generated for ${inviteName}! They can now register using this email.`);
  };

  const handleDeactivateDriver = (driverId: string, currentStatus: boolean) => {
    const match = drivers.find(d => d.driver_id === driverId);
    if (!match) return;

    const action = () => {
      driversApi.saveDriver({
        ...match,
        is_active: !currentStatus
      });
      refreshData();
    };

    executeWithOtpGuard('driver_deactivate', driverId, action);
  };

  // RECON AUDITING
  const handleApproveRecon = (id: string, notes: string) => {
    const match = weeklyRecons.find(r => r.id === id);
    if (!match) return;

    const action = () => {
      reconApi.saveRecon({
        ...match,
        director_sign_off: true,
        status: 'reviewed',
        reviewed_by: admin.name,
        reviewed_at: new Date().toISOString(),
        admin_review_notes: notes
      });
      refreshData();
    };

    executeWithOtpGuard('recon_approval', id, action, 'Director clearance needed to sign-off and approve weekly financial sheet.');
  };

  const handleApproveTransfer = (id: string) => {
    const match = transferRecons.find(r => r.id === id);
    if (!match) return;

    const action = () => {
      transferReconApi.saveRecon({
        ...match,
        status: 'reviewed',
        reviewed_by: admin.name,
        reviewed_at: new Date().toISOString()
      });
      refreshData();
    };

    executeWithOtpGuard('transfer_approval', id, action);
  };

  const handleReviewEditRequest = (id: string, type: 'weekly' | 'transfer', action: 'approved' | 'rejected') => {
    const notes = action === 'rejected' ? prompt('Enter rejection reason:') || 'Incomplete details' : '';

    const execute = () => {
      if (type === 'weekly') {
        reconApi.reviewEditRequest(id, action, notes);
      } else {
        transferReconApi.reviewEditRequest(id, action, notes);
      }
      refreshData();
    };

    executeWithOtpGuard('review_edit_request', id, execute);
  };

  // FINES HANDLERS
  const handleFineDriverLookup = () => {
    if (!fineForm.vehicle_reg || !fineForm.fine_timestamp) {
      alert('Please fill vehicle registration and timestamp first.');
      return;
    }

    const driverMatch = trafficFinesApi.lookupDriverForFine(fineForm.vehicle_reg, fineForm.fine_timestamp);
    if (driverMatch) {
      setFineAutofilledDriver({
        driverId: driverMatch.driverId,
        name: driverMatch.driverName,
        bookingId: driverMatch.bookingId
      });
      // Autofill email
      const drv = drivers.find(d => d.driver_id === driverMatch.driverId);
      if (drv) {
        setFineForm(prev => ({ ...prev, notification_email: drv.email }));
      }
    } else {
      setFineAutofilledDriver(null);
      alert('🔍 Driver Lookup: No active driver found matching this vehicle & timestamp in compiled bookings schedules.');
    }
  };

  const handleSaveFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineForm.vehicle_reg || !fineForm.fine_reference) return;

    trafficFinesApi.saveFine({
      id: `fine-${Math.random().toString(36).substring(2, 9)}`,
      booking_id: fineAutofilledDriver?.bookingId || 'MOCK-FINE',
      vehicle_reg: fineForm.vehicle_reg,
      driver_id: fineAutofilledDriver?.driverId || drivers[0]?.driver_id || 'UNKNOWN',
      fine_timestamp: fineForm.fine_timestamp,
      fine_reference: fineForm.fine_reference,
      location: fineForm.location,
      description: fineForm.description,
      amount: Number(fineForm.amount) || 0,
      notification_email: fineForm.notification_email,
      email_sent: true,
      email_sent_at: new Date().toISOString(),
      status: fineForm.status || 'pending',
      logged_by_admin_id: admin.driver_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    setFineForm({
      vehicle_reg: '', fine_timestamp: new Date().toISOString().substring(0, 16),
      fine_reference: '', location: '', description: '', amount: '', notification_email: '',
      status: 'pending'
    });
    setFineAutofilledDriver(null);
    refreshData();
    alert('✅ Traffic fine logged. Driver notified and fine schedule synced!');
  };

  const handleToggleFineStatus = (fineId: string, currentStatus: 'paid' | 'pending') => {
    const fines = trafficFinesApi.getFines();
    const target = fines.find(f => f.id === fineId);
    if (target) {
      target.status = currentStatus === 'paid' ? 'pending' : 'paid';
      target.updated_at = new Date().toISOString();
      trafficFinesApi.saveFine(target);
      refreshData();
    }
  };

  const handleResendFineEmail = (fine: TrafficFine) => {
    fine.email_sent = true;
    fine.email_sent_at = new Date().toISOString();
    trafficFinesApi.saveFine(fine);
    refreshData();
    alert(`📧 Resent notification email for fine ${fine.fine_reference} to ${fine.notification_email}!`);
  };

  // COMPILING WAGES DATA
  const getCompiledWages = () => {
    const wageDetails: Record<string, { driverName: string; tripReconsAmount: number; transfersAmount: number; total: number; sheetsCount: number }> = {};

    weeklyRecons.forEach(rec => {
      if (rec.status === 'reviewed') {
        const isWithin = rec.week_start >= wageStartDate && rec.week_end <= wageEndDate;
        if (isWithin) {
          const drv = drivers.find(d => d.driver_id === rec.driver_id);
          const name = drv ? drv.name : rec.driver_id;
          
          if (!wageDetails[rec.driver_id]) {
            wageDetails[rec.driver_id] = { driverName: name, tripReconsAmount: 0, transfersAmount: 0, total: 0, sheetsCount: 0 };
          }
          wageDetails[rec.driver_id].tripReconsAmount += rec.driver_rate;
          wageDetails[rec.driver_id].total += rec.driver_rate;
          wageDetails[rec.driver_id].sheetsCount += 1;
        }
      }
    });

    transferRecons.forEach(rec => {
      if (rec.status === 'reviewed') {
        const isWithin = rec.week_start >= wageStartDate && rec.week_end <= wageEndDate;
        if (isWithin) {
          const drv = drivers.find(d => d.driver_id === rec.driver_id);
          const name = drv ? drv.name : rec.driver_id;
          
          if (!wageDetails[rec.driver_id]) {
            wageDetails[rec.driver_id] = { driverName: name, tripReconsAmount: 0, transfersAmount: 0, total: 0, sheetsCount: 0 };
          }
          const sum = rec.transfers.reduce((total, curr) => total + curr.amount, 0);
          wageDetails[rec.driver_id].transfersAmount += sum;
          wageDetails[rec.driver_id].total += sum;
        }
      }
    });

    return Object.entries(wageDetails);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-teal-500 selection:text-white">
      
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 p-2 rounded-xl text-white font-extrabold tracking-tight">IN</div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight">INYATHI Admin Dashboard</h1>
            <p className="text-[10px] font-semibold text-slate-500">Supervisory Back-Office</p>
          </div>
        </div>

        {/* Region and Auth selectors */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          
          {/* Region selector */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => handleRegionSwitch('Cape Town')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                region === 'Cape Town' ? 'bg-white text-teal-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Cape Town
            </button>
            <button
              onClick={() => handleRegionSwitch('Joburg')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                region === 'Joburg' ? 'bg-white text-teal-600 font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Joburg
            </button>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <span className="text-[11px] bg-teal-50 text-teal-600 py-1 px-2.5 rounded-full border border-teal-200">
              {admin.name}
            </span>
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-rose-500 hover:text-rose-700 transition-all"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Menu */}
        <aside className="w-64 bg-slate-900 text-slate-400 p-4 flex flex-col justify-between shrink-0 border-r border-slate-800">
          <div className="space-y-6">
            <div className="px-3">
              <p className="text-[9px] uppercase font-black tracking-wider text-slate-500">Fleet Logistics</p>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'dashboard', label: 'Month Calendar', icon: CalendarIcon },
                { id: 'bookings', label: 'Bookings List', icon: ClipboardCheck },
                { id: 'fleet', label: 'Owned Fleet', icon: Car },
                { id: 'rented', label: 'Rented-In Vehicles', icon: Car },
                { id: 'drivers', label: 'Manage Drivers', icon: Users },
                { id: 'recons', label: 'Trip Recons', icon: FileText },
                { id: 'transfers', label: 'Transfer Recons', icon: FileText },
                { id: 'wages', label: 'Wages & Payroll', icon: Landmark },
                { id: 'fines', label: 'Traffic Fines', icon: AlertOctagon },
                { id: 'expenses', label: 'Vehicle Expenses', icon: Landmark },
                { id: 'incidents', label: 'Incident Reports', icon: AlertTriangle },
                { id: 'settings', label: 'Security Gate', icon: Settings }
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                      isActive 
                        ? 'bg-teal-600 text-white font-extrabold shadow' 
                        : 'hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Stats sidebar footer */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
            <div className="flex justify-between">
              <span>Region Filter:</span>
              <strong className="text-teal-400">{region}</strong>
            </div>
            <div className="flex justify-between">
              <span>Active Bookings:</span>
              <strong className="text-white">{bookings.length}</strong>
            </div>
            <div className="flex justify-between">
              <span>Service Alerts:</span>
              <strong className="text-amber-500">
                {vehicles.filter(v => (v.next_service_km - v.current_mileage) <= 2000).length} vehicles
              </strong>
            </div>
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50">

          {/* ==================== DASHBOARD CALENDAR TAB ==================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-xs border border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Schedules Dispatch</h2>
                  <p className="text-xs text-slate-500">Visual calendar of bookings and assignments compiled for {region}.</p>
                </div>
                <button
                  onClick={() => handleOpenNewBooking()}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Dispatch New Booking
                </button>
              </div>

              <CalendarGrid
                bookings={bookings}
                vehicles={vehicles}
                onSelectDate={(date) => handleOpenNewBooking(date)}
                onSelectBooking={(b) => handleOpenEditBooking(b)}
              />
            </div>
          )}

          {/* ==================== BOOKINGS LIST TAB ==================== */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-900">Bookings Manifest Archive</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadCSV(bookings, `bookings_manifest_${region.replace(' ', '_')}.csv`)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Export Sheet
                  </button>
                  <button
                    onClick={() => handleOpenNewBooking()}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    Add Booking
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Invoice / Ref</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Route Details</th>
                      <th className="p-3">Schedule</th>
                      <th className="p-3">Driver</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 italic">No bookings scheduled in this region.</td>
                      </tr>
                    ) : (
                      bookings.map(b => (
                        <tr key={b.invoice_no} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-extrabold text-slate-800">{b.invoice_no}</span>
                            <span className="block text-[10px] text-slate-400 font-medium">Ref: {b.tour_reference}</span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{b.client_name}</td>
                          <td className="p-3 text-slate-600 font-medium max-w-[200px]">
                            <span className="truncate block">{b.route}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.itinerary_url && (
                                <button
                                  onClick={async () => {
                                    const signed = await getSignedUrlForView(b.itinerary_url!);
                                    window.open(signed, '_blank');
                                  }}
                                  className="inline-flex items-center gap-0.5 text-[9px] bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 px-1 py-0.5 rounded font-black whitespace-nowrap cursor-pointer"
                                >
                                  <FileText className="w-2.5 h-2.5 text-teal-500" /> Itinerary
                                </button>
                              )}
                              {b.booking_documents && b.booking_documents.length > 0 && (
                                <button
                                  onClick={async () => {
                                    const firstDoc = b.booking_documents[0]?.url;
                                    if (firstDoc) {
                                      const signed = await getSignedUrlForView(firstDoc);
                                      window.open(signed, '_blank');
                                    }
                                  }}
                                  className="inline-flex items-center gap-0.5 text-[9px] bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 px-1 py-0.5 rounded font-black whitespace-nowrap cursor-pointer"
                                >
                                  <Eye className="w-2.5 h-2.5 text-slate-500" /> Docs ({b.booking_documents.length})
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold block">{new Date(b.start_date).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400">{new Date(b.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className="p-3 font-bold text-slate-700">
                            {drivers.find(d => d.driver_id === b.assigned_driver_id)?.name || b.assigned_driver_id}
                          </td>
                          <td className="p-3 font-bold text-slate-700">
                            {b.is_rented_vehicle ? `${b.rented_vehicle_model} (RENTED)` : b.assigned_vehicle_reg}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                              b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3 text-right flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleOpenEditBooking(b)}
                              className="text-teal-600 hover:text-teal-800 font-bold hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => requestBookingDelete(b.invoice_no)}
                              className="text-rose-500 hover:text-rose-700 font-bold hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pending deletions section */}
              {deleteRequests.filter(r => r.status === 'pending').length > 0 && (
                <div className="mt-8 bg-rose-50/80 border border-rose-150 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-extrabold text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Pending Deletion Requests ({deleteRequests.filter(r => r.status === 'pending').length})
                  </h3>
                  
                  <div className="space-y-2">
                    {deleteRequests.filter(r => r.status === 'pending').map(req => (
                      <div key={req.id} className="bg-white p-3.5 rounded-lg border border-rose-100 flex justify-between items-center text-xs shadow-xs animate-pulse-slow">
                        <div>
                          <p className="font-extrabold text-slate-800">Booking: {req.booking_id} • Type: <span className="text-rose-600 uppercase">{req.cancellation_type}</span></p>
                          <p className="text-slate-500 mt-1">Requested by: <strong className="text-slate-700">{req.requested_by}</strong> • Reason: <strong className="text-slate-800">&quot;{req.reason}&quot;</strong></p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => executeWithOtpGuard('booking_delete_reject', req.id, () => bookingsApi.reviewDeleteRequest(req.id, admin.driver_id, 'rejected', 'Retained by Admin'))}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 px-2.5 rounded"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => executeWithOtpGuard('booking_delete', req.id, () => bookingsApi.reviewDeleteRequest(req.id, admin.driver_id, 'approved'))}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-1 px-3 rounded shadow-xs"
                          >
                            Approve Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== FLEET TAB ==================== */}
          {activeTab === 'fleet' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Owned Fleet Fleet Management</h2>
                  <p className="text-xs text-slate-500">Service schedule indicator highlights in red if mileage is within 2,000 km of service mileage.</p>
                </div>
                <button
                  onClick={() => {
                    setVehicleForm({
                      registration_no: '', make: '', model: '', year: 2023, current_mileage: 0,
                      next_service_km: 10000, status: 'active', color: '#14b8a6', notes: ''
                    });
                    setShowVehicleModal(true);
                  }}
                  className="bg-teal-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                >
                  Add Vehicle
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map(v => {
                  const serviceDueRemaining = v.next_service_km - v.current_mileage;
                  const isServiceDue = serviceDueRemaining <= 2000;

                  return (
                    <div key={v.registration_no} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: v.color }} />
                          <div>
                            <span className="text-xs font-black text-slate-800">{v.registration_no}</span>
                            <h3 className="text-sm font-extrabold text-slate-900">{v.make} {v.model}</h3>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          v.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {v.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold">CURRENT MILEAGE</p>
                          <p className="text-slate-800 font-bold">{v.current_mileage} km</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold">NEXT SERVICE KM</p>
                          <p className={`font-bold ${isServiceDue ? 'text-rose-600' : 'text-slate-800'}`}>{v.next_service_km} km</p>
                        </div>
                      </div>

                      {isServiceDue && (
                        <div className="p-2.5 bg-rose-50 border border-rose-100 rounded text-[10px] text-rose-700 font-semibold flex items-center gap-1.5">
                          <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600 animate-pulse-slow" />
                          <span>🚨 SERVICE ALERT: Scheduled maintenance limit is within {serviceDueRemaining} km! Email alert triggered to managers.</span>
                        </div>
                      )}

                      <div className="flex gap-1 justify-end pt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setVehicleForm(v);
                            setShowVehicleModal(true);
                          }}
                          className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded transition-colors"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => deleteVehicle(v.registration_no)}
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== RENTED VEHICLES TAB ==================== */}
          {activeTab === 'rented' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-900">Rented-In Third-Party Vehicles</h2>
                <button
                  onClick={() => {
                    setRentedForm({
                      supplier: '', reg_no: '', make: '', model: '', start_date: new Date().toISOString().substring(0, 10),
                      end_date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().substring(0, 10),
                      daily_rate: 1500, supplier_ref: '', status: 'active', notes: ''
                    });
                    setShowRentedModal(true);
                  }}
                  className="bg-teal-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                >
                  Add Rental
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-extrabold text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Supplier Ref</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Reg No</th>
                      <th className="p-3">Rental Dates</th>
                      <th className="p-3">Daily Rate</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rentedVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 italic">No rental vehicles listed currently.</td>
                      </tr>
                    ) : (
                      rentedVehicles.map(rv => (
                        <tr key={rv.id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-extrabold block text-slate-800">{rv.supplier}</span>
                            <span className="text-[10px] text-slate-400">Ref: {rv.supplier_ref}</span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{rv.make} {rv.model}</td>
                          <td className="p-3 font-mono font-bold">{rv.reg_no}</td>
                          <td className="p-3 text-slate-600">{rv.start_date} to {rv.end_date}</td>
                          <td className="p-3 font-bold text-slate-800">R {rv.daily_rate} / day</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setRentedForm(rv);
                                setShowRentedModal(true);
                              }}
                              className="text-teal-600 font-bold mr-2.5 hover:underline"
                            >
                              Modify
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Remove rented vehicle record?')) {
                                  fleetApi.deleteRentedVehicle(rv.id);
                                  refreshData();
                                }
                              }}
                              className="text-rose-600 font-bold hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== MANAGE DRIVERS TAB ==================== */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Invites Generation Column */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                  <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Generate Driver Signup Invite</h3>
                  <form onSubmit={handleSendInvite} className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Driver&apos;s Name</span>
                      <input
                        type="text" required placeholder="e.g. Johnathan Doe"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Invited Email</span>
                      <input
                        type="email" required placeholder="name@domain.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg transition-colors shadow-xs"
                    >
                      Generate Invite voucher
                    </button>
                  </form>

                  {/* Active invites list */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Active Invite list</span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {driverInvites.map(i => (
                        <div key={i.email} className="bg-slate-50 p-2 rounded border border-slate-150 text-[10px]">
                          <p className="font-bold text-slate-700">{i.full_name}</p>
                          <p className="text-slate-400">{i.email}</p>
                          <p className="text-[9px] text-teal-600 mt-0.5">Status: {i.used_at ? 'REGISTERED' : 'PENDING'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Drivers table list */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="p-3">Driver ID</th>
                        <th className="p-3">Name Details</th>
                        <th className="p-3">Mobile Contact</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drivers.map(d => (
                        <tr key={d.driver_id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-800">{d.driver_id}</td>
                          <td className="p-3">
                            <span className="font-bold block text-slate-900">{d.name}</span>
                            <span className="text-[10px] text-slate-400">{d.email}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{d.phone}</td>
                          <td className="p-3 font-semibold text-slate-600">{d.location}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              d.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {d.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeactivateDriver(d.driver_id, d.is_active)}
                              className={`font-bold ${d.is_active ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'}`}
                            >
                              {d.is_active ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* ==================== TRIP RECONS AUDITING TAB ==================== */}
          {activeTab === 'recons' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">Auditing Weekly Trip Cost Reconciliations</h2>

              <div className="space-y-3">
                {weeklyRecons.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-6 border border-slate-200 rounded-xl text-center">No weekly trip recon sheets submitted yet.</p>
                ) : (
                  weeklyRecons.map(rec => {
                    const drv = drivers.find(d => d.driver_id === rec.driver_id);
                    const driverName = drv ? drv.name : rec.driver_id;

                    return (
                      <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded">
                              ID: {rec.id}
                            </span>
                            <h3 className="text-sm font-extrabold text-slate-900 mt-1">{driverName} • Week Period: {rec.week_start} to {rec.week_end}</h3>
                            <p className="text-xs text-slate-500 font-semibold">Tour reference: {rec.tour_reference || 'N/A'} • Vehicle: {rec.vehicle_reg}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                            rec.status === 'reviewed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {rec.status}
                          </span>
                        </div>

                        {/* Cost detail breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-150">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Trip Budget Allocation</span>
                            <span className="font-black text-slate-800">R {rec.trip_budget.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Driver Food & Wage rate</span>
                            <span className="font-bold text-slate-700">R {(rec.driver_food + rec.driver_rate).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Flights & Accommodation</span>
                            <span className="font-bold text-slate-700">R {(rec.flights_to_from + rec.accommodation).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Total Profit / Loss</span>
                            <span className={`font-black ${rec.total_profit_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              R {rec.total_profit_loss.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Wellness & Fatigue Indicators */}
                        <div className="text-[11px] bg-slate-50 p-2.5 rounded border border-slate-150 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500 block font-bold">Fatigue index: <strong className="text-slate-700">{rec.fatigue_level}/10</strong></span>
                            <span className="text-slate-500 block font-bold">Stress level: <strong className="text-slate-700">{rec.stress_level}/10</strong></span>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-bold">Vehicle issues reported: <strong className="text-rose-600">{rec.vehicle_issues || 'None'}</strong></span>
                            <span className="text-slate-500 block font-bold">Accidents: <strong className="text-rose-600">{rec.accidents_incidents || 'None'}</strong></span>
                          </div>
                        </div>

                        {/* Edit request approval banner */}
                        {rec.edit_request_status === 'pending' && (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex justify-between items-center text-xs">
                            <div>
                              <p className="font-black text-amber-800 uppercase text-[9px]">Pending Edit Authorization Request</p>
                              <p className="text-slate-600 mt-0.5">Reason: &quot;{rec.edit_request_reason}&quot;</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleReviewEditRequest(rec.id, 'weekly', 'rejected')}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 px-2 rounded"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleReviewEditRequest(rec.id, 'weekly', 'approved')}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1 px-3.5 rounded shadow-xs"
                              >
                                Approve Edit
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Director actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <button
                            onClick={() => downloadReconPDF(rec, driverName)}
                            className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            PDF Report
                          </button>

                          {rec.status === 'submitted' && (
                            <button
                              onClick={() => {
                                const notes = prompt('Enter review auditing notes (optional):');
                                handleApproveRecon(rec.id, notes || 'Audited by Backoffice');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-colors shadow-xs"
                            >
                              Director Sign-Off Approval
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==================== TRANSFER RECONS TAB ==================== */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">Auditing Weekly Transfer payment sheets</h2>

              <div className="space-y-3">
                {transferRecons.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-6 border border-slate-200 rounded-xl text-center">No transfer sheets submitted yet.</p>
                ) : (
                  transferRecons.map(rec => {
                    const drv = drivers.find(d => d.driver_id === rec.driver_id);
                    const driverName = drv ? drv.name : rec.driver_id;
                    const totalWage = rec.transfers.reduce((sum, curr) => sum + curr.amount, 0);

                    return (
                      <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900">{driverName} • Week Period: {rec.week_start} to {rec.week_end}</h3>
                            <p className="text-xs text-slate-500 font-semibold">Total Passengers Completed: {rec.transfers.length} records</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                            rec.status === 'reviewed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {rec.status}
                          </span>
                        </div>

                        <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-150 flex justify-between items-center">
                          <span className="text-slate-500">Total Wage rate earnings payout:</span>
                          <span className="font-black text-teal-600 text-sm">R {totalWage.toFixed(2)}</span>
                        </div>

                        {/* Audit transfers rows */}
                        <div className="border border-slate-150 rounded overflow-hidden max-h-36 overflow-y-auto">
                          <table className="w-full text-left text-[11px] bg-slate-50">
                            <thead className="bg-slate-100 text-[9px] uppercase font-bold text-slate-500">
                              <tr>
                                <th className="p-2">Passenger</th>
                                <th className="p-2">Route</th>
                                <th className="p-2">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {rec.transfers.map((t, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 font-bold text-slate-800">{t.passenger_name}</td>
                                  <td className="p-2 text-slate-600">{t.pickup_location} → {t.dropoff_location}</td>
                                  <td className="p-2 font-bold text-slate-800">R {t.amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Edit request banner */}
                        {rec.edit_request_status === 'pending' && (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex justify-between items-center text-xs">
                            <div>
                              <p className="font-black text-amber-800 uppercase text-[9px]">Edit Authorization Request</p>
                              <p className="text-slate-600 mt-0.5">Reason: &quot;{rec.edit_request_reason}&quot;</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleReviewEditRequest(rec.id, 'transfer', 'rejected')}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 px-2.5 rounded"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleReviewEditRequest(rec.id, 'transfer', 'approved')}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1 px-3 rounded shadow-xs"
                              >
                                Approve Edit
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <button
                            onClick={() => downloadTransferReconPDF(rec, driverName)}
                            className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            PDF Report
                          </button>

                          {rec.status === 'submitted' && (
                            <button
                              onClick={() => handleApproveTransfer(rec.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-colors shadow-xs"
                            >
                              Director Sign-Off Approval
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==================== WAGES & PAYROLL TAB ==================== */}
          {activeTab === 'wages' && (
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Wages Reconciliation and Payroll Compiler</h2>
                    <p className="text-xs text-slate-500">Compiles both Trip wage rates and completed passenger transfers rate payouts across dates for {region}.</p>
                  </div>
                  <button
                    onClick={() => {
                      const payrollData = getCompiledWages().map(([driverId, details]) => ({
                        driver_id: driverId,
                        driver_name: details.driverName,
                        sheets_reviewed: details.sheetsCount,
                        trip_recon_wages: `R ${details.tripReconsAmount}`,
                        transfers_payout: `R ${details.transfersAmount}`,
                        total_net_payroll: `R ${details.total}`,
                        period: `${wageStartDate} to ${wageEndDate}`,
                        region: region
                      }));
                      downloadCSV(payrollData, `compiled_payroll_${region.replace(' ', '_')}_${wageStartDate}_to_${wageEndDate}.csv`);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" /> Export Payroll Sheet
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Period Start date</span>
                    <input
                      type="date"
                      value={wageStartDate}
                      onChange={(e) => setWageStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Period End date</span>
                    <input
                      type="date"
                      value={wageEndDate}
                      onChange={(e) => setWageEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Compiled Payroll Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3">Driver Name Details</th>
                      <th className="p-3">Reviewed Sheets</th>
                      <th className="p-3">Trip Wages rate Claims</th>
                      <th className="p-3">Passenger transfers Claim</th>
                      <th className="p-3 text-right">TOTAL NET PAYOUT (ZAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getCompiledWages().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 italic">No approved weekly recons listed within this date range.</td>
                      </tr>
                    ) : (
                      getCompiledWages().map(([driverId, details]) => (
                        <tr key={driverId} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-extrabold text-slate-900 block">{details.driverName}</span>
                            <span className="text-[10px] text-slate-400">ID: {driverId}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-600">{details.sheetsCount} sheets signed off</td>
                          <td className="p-3 font-bold text-slate-800">R {details.tripReconsAmount.toFixed(2)}</td>
                          <td className="p-3 font-bold text-slate-800">R {details.transfersAmount.toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-teal-600 text-sm">
                            R {details.total.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TRAFFIC FINES TAB ==================== */}
          {activeTab === 'fines' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Log new Fine form */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3">
                  <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Log Traffic violation Fine</h3>
                  
                  <form onSubmit={handleSaveFine} className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Vehicle Registration</span>
                      <select
                        value={fineForm.vehicle_reg}
                        onChange={(e) => setFineForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      >
                        <option value="">Select Vehicle...</option>
                        {vehicles.map(v => (
                          <option key={v.registration_no} value={v.registration_no}>{v.registration_no}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Violation Timestamp</span>
                      <input
                        type="datetime-local"
                        value={fineForm.fine_timestamp}
                        onChange={(e) => setFineForm(prev => ({ ...prev, fine_timestamp: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    {/* Lookup driver helper button */}
                    <button
                      type="button"
                      onClick={handleFineDriverLookup}
                      className="w-full text-center bg-teal-50 hover:bg-teal-100 text-teal-700 py-1.5 rounded border border-teal-200 font-bold"
                    >
                      🔍 Lookup driver by fine time
                    </button>

                    {fineAutofilledDriver && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded p-2.5 text-[11px] text-emerald-800 animate-scale-up space-y-0.5">
                        <p><strong>Auto-located Driver:</strong> {fineAutofilledDriver.name}</p>
                        <p><strong>Assigned Booking:</strong> {fineAutofilledDriver.bookingId}</p>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 block mb-1">Fine Reference Code</span>
                      <input
                        type="text" required placeholder="e.g. TX-9082-CT"
                        value={fineForm.fine_reference}
                        onChange={(e) => setFineForm(prev => ({ ...prev, fine_reference: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">ZAR Fine Amount</span>
                      <input
                        type="number" required placeholder="ZAR Cost"
                        value={fineForm.amount}
                        onChange={(e) => setFineForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Location / Details</span>
                      <input
                        type="text" placeholder="e.g. Speed lock camera N1 outbound"
                        value={fineForm.location}
                        onChange={(e) => setFineForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Notification Email</span>
                      <input
                        type="email" required placeholder="driver@domain.co.za"
                        value={fineForm.notification_email}
                        onChange={(e) => setFineForm(prev => ({ ...prev, notification_email: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Payment Status</span>
                      <select
                        value={fineForm.status}
                        onChange={(e) => setFineForm(prev => ({ ...prev, status: e.target.value as 'paid' | 'pending' }))}
                        className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800"
                      >
                        <option value="pending">Pending / Unpaid</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg transition-colors shadow-xs"
                    >
                      Record Fine & Send alert
                    </button>
                  </form>
                </div>

                {/* Fines table log */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="p-3">Reference / Code</th>
                        <th className="p-3">Vehicle / Driver</th>
                        <th className="p-3">Violation Time</th>
                        <th className="p-3">Location Details</th>
                        <th className="p-3">Driver Notification</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Cost (ZAR)</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trafficFines.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-400 italic">No fines logged currently.</td>
                        </tr>
                      ) : (
                        trafficFines.map(f => {
                          const drv = drivers.find(d => d.driver_id === f.driver_id);
                          const driverName = drv ? drv.name : f.driver_id;
                          return (
                            <tr key={f.id} className="hover:bg-slate-50/50">
                              <td className="p-3">
                                <span className="font-extrabold text-slate-800 block">{f.fine_reference}</span>
                                {f.description && <span className="text-[10px] text-slate-400 block mt-0.5">{f.description}</span>}
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-slate-900 block">{f.vehicle_reg}</span>
                                <span className="text-[10px] text-teal-600 font-medium">{driverName}</span>
                              </td>
                              <td className="p-3 text-slate-600">{new Date(f.fine_timestamp).toLocaleString()}</td>
                              <td className="p-3 text-slate-500 font-medium max-w-[150px] truncate">{f.location}</td>
                              <td className="p-3">
                                <span className="text-slate-700 font-mono text-[11px] block">{f.notification_email}</span>
                                {f.email_sent ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-[9px] text-emerald-600">
                                      Notified {f.email_sent_at ? new Date(f.email_sent_at).toLocaleDateString() : ''}
                                    </span>
                                    <button 
                                      onClick={() => handleResendFineEmail(f)}
                                      className="text-[9px] text-teal-600 hover:underline ml-1.5 font-bold"
                                    >
                                      Resend
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-amber-500 font-medium mt-0.5 block">Not notified yet</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  f.status === 'paid' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                                }`}>
                                  {f.status === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-rose-600">R {f.amount}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleToggleFineStatus(f.id, f.status)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                    f.status === 'paid'
                                      ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {f.status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* ==================== EXPENSES LOG TAB ==================== */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-900">Vehicle Expenses and Damages approvals</h2>
                <button
                  onClick={() => downloadCSV(vehicleExpenses, 'vehicle_expenses_log.csv')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 flex items-center gap-1 transition-colors"
                >
                  <Download className="w-4 h-4" /> Export Expenses Sheet
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3">Receipt / Details</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Expense Type</th>
                      <th className="p-3">Logged Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action approvals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400 italic">No receipts reported by drivers currently.</td>
                      </tr>
                    ) : (
                      vehicleExpenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{exp.description}</span>
                            <span className="text-[10px] text-slate-400 block">Logged by: {exp.driver_id}</span>
                            {((exp.document_urls && exp.document_urls.length > 0) || (exp.photo_urls && exp.photo_urls.length > 0)) && (
                              <button
                                onClick={async () => {
                                  const url = exp.document_urls?.[0] || exp.photo_urls?.[0] || '';
                                  if (url) {
                                    const signed = await getSignedUrlForView(url);
                                    window.open(signed, '_blank');
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:underline font-extrabold mt-1"
                              >
                                <Eye className="w-3 h-3" /> View Receipt Slip
                              </button>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-700">{exp.vehicle_reg}</td>
                          <td className="p-3 text-slate-600 font-semibold">{exp.expense_type}</td>
                          <td className="p-3 text-slate-500">{exp.expense_date}</td>
                          <td className="p-3 font-bold text-slate-800">R {exp.amount}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                              exp.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {exp.status}
                            </span>
                          </td>
                          <td className="p-3 text-right flex gap-1 justify-end">
                            {exp.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Enter rejection reason:');
                                    if (reason) {
                                      expensesApi.saveExpense({ ...exp, status: 'rejected', rejection_reason: reason });
                                      refreshData();
                                    }
                                  }}
                                  className="text-rose-600 font-bold hover:underline"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    expensesApi.saveExpense({ ...exp, status: 'approved' });
                                    refreshData();
                                  }}
                                  className="text-emerald-600 font-bold hover:underline ml-2"
                                >
                                  Approve
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== INCIDENT REPORTS TAB ==================== */}
          {activeTab === 'incidents' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">Driver Incident Reports logs</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incidentReports.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-6 border border-slate-200 rounded-xl text-center col-span-2">No accident incident records logged yet.</p>
                ) : (
                  incidentReports.map(inc => (
                    <div key={inc.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200`}>
                            {inc.incident_type}
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-900 mt-1.5">Vehicle: {inc.vehicle_reg} • Driver: {inc.driver_id}</h3>
                          <p className="text-xs text-slate-500 font-semibold">Location details: {inc.location}</p>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                          inc.status === 'closed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                        }`}>
                          {inc.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-150">
                        &quot;{inc.description}&quot;
                      </p>

                      {((inc.photo_urls && inc.photo_urls.length > 0) || (inc.document_urls && inc.document_urls.length > 0)) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                          {inc.photo_urls?.filter(Boolean).map((url, idx) => (
                            <button
                              key={idx}
                              onClick={async () => {
                                const signed = await getSignedUrlForView(url);
                                window.open(signed, '_blank');
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:underline font-extrabold bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                            >
                              <Eye className="w-3 h-3 text-teal-500" /> Incident Photo #{idx + 1}
                            </button>
                          ))}
                          {inc.document_urls?.filter(Boolean).map((url, idx) => (
                            <button
                              key={idx}
                              onClick={async () => {
                                const signed = await getSignedUrlForView(url);
                                window.open(signed, '_blank');
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:underline font-extrabold bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                            >
                              <Eye className="w-3 h-3 text-teal-500" /> Incident Doc #{idx + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">Filed: {new Date(inc.created_at).toLocaleString()}</span>
                        {inc.status !== 'closed' && (
                          <button
                            onClick={() => {
                              incidentsApi.saveIncident({ ...inc, status: 'closed' });
                              refreshData();
                            }}
                            className="bg-slate-900 text-white text-xs font-bold py-1 px-3 rounded hover:bg-slate-800 transition-colors"
                          >
                            Close Incident Log
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================== SECURITY SETTINGS TAB ==================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs max-w-lg space-y-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  Security Gate Clearance Settings
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  In production, INYATHI uses dual-factor administrative OTP email validation before allowing critical edits, deleting confirmed bookings, deactivating staff, or approving trip sheets.
                </p>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">OTP Security Gate Mode</span>
                    <span className="text-[10px] text-slate-500 font-medium">Toggle code-verification requirement for demo purposes.</span>
                  </div>

                  <button
                    onClick={() => {
                      const updated = !otpEnabled;
                      setOtpEnabled(updated);
                      authApi.setOtpEnabled(updated);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                      otpEnabled 
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md' 
                        : 'bg-slate-200 text-slate-500 border-slate-300'
                    }`}
                  >
                    {otpEnabled ? '🔒 OTP STRICT' : '🔓 Plain Confirm Dialog (Bypassed)'}
                  </button>
                </div>

                <div className="p-3.5 bg-teal-50 border border-teal-100 rounded-lg text-xs text-teal-800 leading-relaxed">
                  💡 <strong>DEVELOPER TIP:</strong> When <strong className="text-teal-900">OTP STRICT</strong> is enabled, attempting to sign-off weekly trip sheets or complete deletes will prompt a code popup. A mock email notification with the active numeric code will slide in at the top right of the screen so you can easily type it in!
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ==================== BOOKING ADD/EDIT MODAL ==================== */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {isEditMode ? `Modify Booking Manifest: ${bookingForm.invoice_no}` : 'Dispatch New Tour Booking'}
              </h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block mb-1">Invoice Number (Unique ID)</span>
                  <input
                    type="text" disabled={isEditMode}
                    placeholder="e.g. INV-2026-CT"
                    value={bookingForm.invoice_no}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, invoice_no: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 disabled:opacity-60 font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Tour reference Code</span>
                  <input
                    type="text" placeholder="e.g. WINELANDS-88A"
                    value={bookingForm.tour_reference}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, tour_reference: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Client Name / Group Details</span>
                <input
                  type="text" placeholder="e.g. German Tour Union"
                  value={bookingForm.client_name}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, client_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-850 font-bold"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Route description</span>
                <input
                  type="text" placeholder="e.g. Stellenbosch winelands tour"
                  value={bookingForm.route}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, route: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block mb-1">Departure (Date & Time)</span>
                  <input
                    type="datetime-local"
                    value={bookingForm.start_date}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Return (Date & Time)</span>
                  <input
                    type="datetime-local"
                    value={bookingForm.end_date}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Assignments */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block mb-1">Assign Driver</span>
                  <select
                    value={bookingForm.assigned_driver_id}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, assigned_driver_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800"
                  >
                    <option value="">Select Staff Driver...</option>
                    {drivers.map(d => (
                      <option key={d.driver_id} value={d.driver_id}>{d.name} ({d.driver_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <span className="text-slate-400 block mb-1">Assign Vehicle (Owned Fleet)</span>
                  <select
                    value={bookingForm.assigned_vehicle_reg}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingForm(prev => ({
                        ...prev,
                        assigned_vehicle_reg: val,
                        is_rented_vehicle: false, rented_vehicle_id: '', rented_vehicle_reg: '', rented_vehicle_model: ''
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800"
                  >
                    <option value="">Select Owned Fleet...</option>
                    {vehicles.map(v => (
                      <option key={v.registration_no} value={v.registration_no}>{v.registration_no} ({v.model})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rented-in option toggle */}
              <div className="bg-slate-50 p-2 rounded border border-slate-150 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" id="is-rented-chk"
                    checked={bookingForm.is_rented_vehicle}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setBookingForm(prev => ({
                        ...prev,
                        is_rented_vehicle: checked,
                        assigned_vehicle_reg: checked ? '' : vehicles[0]?.registration_no || ''
                      }));
                    }}
                    className="accent-teal-600"
                  />
                  <label htmlFor="is-rented-chk" className="font-bold text-slate-700">Assign Third-Party Rented Vehicle instead?</label>
                </div>

                {bookingForm.is_rented_vehicle && (
                  <select
                    value={bookingForm.rented_vehicle_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = rentedVehicles.find(r => r.id === val);
                      if (match) {
                        setBookingForm(prev => ({
                          ...prev,
                          rented_vehicle_id: val,
                          rented_vehicle_reg: match.reg_no,
                          rented_vehicle_model: `${match.make} ${match.model}`
                        }));
                      }
                    }}
                    className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-800"
                  >
                    <option value="">Select Rental Vehicle...</option>
                    {rentedVehicles.map(r => (
                      <option key={r.id} value={r.id}>{r.supplier} - {r.make} {r.model} ({r.reg_no})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Document and Itinerary Upload */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-150">
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Itinerary Document</span>
                  {uploadingItinerary ? (
                    <div className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading itinerary...
                    </div>
                  ) : bookingForm.itinerary_url ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Uploaded
                      </div>
                      <span className="text-[9px] text-slate-500 truncate max-w-[150px]" title={bookingForm.itinerary_filename || 'itinerary.pdf'}>
                        {bookingForm.itinerary_filename || 'itinerary.pdf'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setBookingForm(prev => ({ ...prev, itinerary_url: '', itinerary_filename: '', itinerary_uploaded_at: '' }))}
                        className="text-[9px] text-rose-500 hover:underline text-left font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 bg-white p-2 rounded text-center cursor-pointer hover:border-slate-400">
                      <span className="text-[10px] text-slate-500 block">Choose Itinerary File</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleItineraryUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 font-bold block mb-1">General Booking Document</span>
                  {uploadingBookingDoc ? (
                    <div className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading document...
                    </div>
                  ) : bookingForm.booking_documents && bookingForm.booking_documents.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {bookingForm.booking_documents.length} File(s)
                      </div>
                      <span className="text-[9px] text-slate-500 truncate max-w-[150px]" title={bookingForm.booking_documents[bookingForm.booking_documents.length - 1].filename}>
                        {bookingForm.booking_documents[bookingForm.booking_documents.length - 1].filename}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setBookingForm(prev => ({ ...prev, booking_documents: [] }))}
                        className="text-[9px] text-rose-500 hover:underline text-left font-semibold"
                      >
                        Clear All Documents
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 bg-white p-2 rounded text-center cursor-pointer hover:border-slate-400">
                      <span className="text-[10px] text-slate-500 block">Choose Document File</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleBookingDocUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Status and payment info */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border border-slate-150">
                <div>
                  <span className="text-slate-400 block mb-0.5">Booking Status</span>
                  <select
                    value={bookingForm.status}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-white border border-slate-200 p-1 rounded text-slate-800 font-bold"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Payment</span>
                  <select
                    value={bookingForm.payment_status}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, payment_status: e.target.value as any }))}
                    className="w-full bg-white border border-slate-200 p-1 rounded text-slate-800 font-bold"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Receipt Code</span>
                  <input
                    type="text" placeholder="REC-X"
                    value={bookingForm.receipt_number || ''}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, receipt_number: e.target.value }))}
                    className="w-full bg-white border border-slate-200 p-1 rounded text-slate-800 font-bold"
                  />
                </div>
              </div>

              {isEditMode && (
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Reason for Editing Manifest (Audit Log trace)</span>
                  <input
                    type="text" required placeholder="e.g. Driver swap due to illness"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 font-semibold"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={saveBooking}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-2.5 rounded-xl text-xs transition-colors shadow"
              >
                Save Dispatch Manifest Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== OWNED VEHICLE MODAL ==================== */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Record Vehicle details</h3>
            <form onSubmit={saveVehicle} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block mb-1">Registration No</span>
                  <input
                    type="text" placeholder="CA 123-456"
                    value={vehicleForm.registration_no}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, registration_no: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Year</span>
                  <input
                    type="number"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" placeholder="Make"
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, make: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
                <input
                  type="text" placeholder="Model"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block mb-1">Current Mileage</span>
                  <input
                    type="number"
                    value={vehicleForm.current_mileage}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, current_mileage: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded font-bold"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Next Service Limit</span>
                  <input
                    type="number"
                    value={vehicleForm.next_service_km}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, next_service_km: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block mb-1">Status</span>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Visual marker Color</span>
                  <input
                    type="color"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-8 bg-slate-50 border border-slate-200 p-0.5 rounded cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg transition-colors"
              >
                Save Vehicle Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== RENTED VEHICLE MODAL ==================== */}
      {showRentedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Record Rental-In Vehicle</h3>
            <form onSubmit={saveRented} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" required placeholder="Supplier Name"
                  value={rentedForm.supplier}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, supplier: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
                <input
                  type="text" required placeholder="Supplier Ref Code"
                  value={rentedForm.supplier_ref}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, supplier_ref: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text" required placeholder="Reg No"
                  value={rentedForm.reg_no}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, reg_no: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
                <input
                  type="text" placeholder="Make"
                  value={rentedForm.make}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, make: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
                <input
                  type="text" placeholder="Model"
                  value={rentedForm.model}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, model: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block mb-1">Rental Start Date</span>
                  <input
                    type="date"
                    value={rentedForm.start_date}
                    onChange={(e) => setRentedForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Rental End Date</span>
                  <input
                    type="date"
                    value={rentedForm.end_date}
                    onChange={(e) => setRentedForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                  />
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Daily rate (ZAR)</span>
                <input
                  type="number"
                  value={rentedForm.daily_rate}
                  onChange={(e) => setRentedForm(prev => ({ ...prev, daily_rate: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg transition-colors"
              >
                Record Rented Vehicle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== OTP AUTH MODAL GATE ==================== */}
      <OTPModal
        isOpen={showOtpModal}
        onClose={() => {
          setShowOtpModal(false);
          setOtpCallback(null);
        }}
        onVerifySuccess={handleOtpSuccess}
        title="Admin Verification Code Required"
        description={`Administrative OTP verification is active for this action. A verification passcode has been dispatched to authorized Directors.`}
      />

    </div>
  );
}
