'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardCheck, Calendar, FileText, User, LogOut, Briefcase, 
  Plus, Trash2, Camera, Compass, PlusCircle, Sparkles, CheckCircle, Clock, AlertTriangle, FileUp, RefreshCw
} from 'lucide-react';
import { 
  Profile, Vehicle, Booking, Inspection, ReconSheet, TransferReconSheet, RentedVehicle, VehicleChecklist, TrafficFine,
  bookingsApi, fleetApi, inspectionsApi, reconApi, transferReconApi, expensesApi, incidentsApi, checklistsApi, trafficFinesApi, getDocumentUrl,
  uploadToCloudinary, getSignedUrlForView, downloadCSV
} from '@/lib/storage';
import SignaturePad from './SignaturePad';
import { downloadInspectionPDF, downloadReconPDF, downloadTransferReconPDF, downloadChecklistPDF } from '@/lib/pdf';

interface DriverDashboardProps {
  driver: Profile;
  onLogout: () => void;
}

export default function DriverDashboard({ driver, onLogout }: DriverDashboardProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'recon' | 'transfer' | 'logging' | 'documents'>('tasks');
  const [assignedBookings, setAssignedBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  // Inspection State
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedBookingForInspection, setSelectedBookingForInspection] = useState<Booking | null>(null);
  const [inspectionType, setInspectionType] = useState<'pre-trip' | 'post-trip'>('pre-trip');
  const [inspectionChecklist, setInspectionChecklist] = useState<Record<string, 'pass' | 'fail' | 'flag'>>({
    brakes: 'pass', steering: 'pass', tyres: 'pass', lights: 'pass', seatbelts: 'pass',
    windshield: 'pass', fluids: 'pass', horn: 'pass', bodywork: 'pass', emergency_kit: 'pass'
  });
  const [inspectionFaults, setInspectionFaults] = useState<Record<string, string>>({});
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionMileage, setInspectionMileage] = useState<number>(0);
  const [inspectionSignature, setInspectionSignature] = useState('');
  const [inspectionsList, setInspectionsList] = useState<Inspection[]>([]);
  const [inspectionMedia, setInspectionMedia] = useState<Record<string, string>>({});
  const [uploadingMediaKeys, setUploadingMediaKeys] = useState<Record<string, boolean>>({});

  // Weekly Recon Form State
  const [recons, setRecons] = useState<ReconSheet[]>([]);
  const [showNewRecon, setShowNewRecon] = useState(false);
  const [reconForm, setReconForm] = useState<Partial<ReconSheet>>({
    week_start: '',
    week_end: '',
    tour_reference: '',
    vehicle_reg: '',
    start_km: 0,
    end_km: 0,
    total_distance_km: 0,
    trips_completed: 0,
    total_hours: 0,
    cost_lines: [],
    trip_budget: 0,
    driver_food: 0,
    flights_to_from: 0,
    driver_rate: 0,
    accommodation: 0,
    total_profit_loss: 0,
    vehicle_issues: '',
    accidents_incidents: '',
    traffic_violations: '',
    safety_concerns: '',
    maintenance_needed: '',
    fuel_consumption: '',
    tires_condition: '',
    fatigue_level: 5,
    stress_level: 5,
    health_issues: '',
    driver_notes: '',
    slip_image_urls: []
  });
  const [customCostDesc, setCustomCostDesc] = useState('');
  const [customCostAmount, setCustomCostAmount] = useState('');
  const [editRequestReason, setEditRequestReason] = useState('');
  const [activeReconForEditRequest, setActiveReconForEditRequest] = useState<string | null>(null);

  // Transfer Sheet State
  const [transfersSheets, setTransfersSheets] = useState<TransferReconSheet[]>([]);
  const [showNewTransferSheet, setShowNewTransferSheet] = useState(false);
  const [transferForm, setTransferForm] = useState<Partial<TransferReconSheet>>({
    week_start: '',
    week_end: '',
    transfers: []
  });
  const [newTransferRow, setNewTransferRow] = useState({
    date: '',
    passenger_name: '',
    pickup_location: '',
    dropoff_location: '',
    amount: '',
    invoice_or_tour_ref: ''
  });

  // Logging Center State
  const [expenseForm, setExpenseForm] = useState({
    vehicle_reg: '',
    expense_type: 'Other' as any,
    description: '',
    amount: '',
    expense_date: ''
  });
  const [incidentForm, setIncidentForm] = useState({
    vehicle_reg: '',
    incident_type: 'Accident',
    description: '',
    location: '',
    injuries: false
  });
  const [checklistForm, setChecklistForm] = useState<Partial<VehicleChecklist>>({
    week_start: '',
    week_end: '',
    checklist_data: {
      engine_oil: 'ok', coolant: 'ok', brake_fluid: 'ok', windshield_washer: 'ok',
      tyres_pressure: 'ok', tyres_tread: 'ok', lights_headlights: 'ok', lights_indicators: 'ok',
      lights_brake: 'ok', wipers: 'ok', horn: 'ok', bodywork: 'ok'
    },
    mileage: 0,
    notes: ''
  });
  const [driverChecklists, setDriverChecklists] = useState<VehicleChecklist[]>([]);
  const [driverFines, setDriverFines] = useState<TrafficFine[]>([]);

  // Cloudinary real upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [expenseUrl, setExpenseUrl] = useState('');
  const [uploadingIncident, setUploadingIncident] = useState(false);
  const [incidentUrl, setIncidentUrl] = useState('');
  const [uploadingVaultDoc, setUploadingVaultDoc] = useState(false);
  const [vaultDocs, setVaultDocs] = useState<{name: string, url: string}[]>([]);

  const handleExpenseFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'expenses');
      setExpenseUrl(uploadResult.url);
    } catch (err) {
      alert("Failed to upload document to Cloudinary");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleIncidentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIncident(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'incidents');
      setIncidentUrl(uploadResult.url);
    } catch (err) {
      alert("Failed to upload incident file to Cloudinary");
    } finally {
      setUploadingIncident(false);
    }
  };

  const handleVaultFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVaultDoc(true);
    try {
      const uploadResult = await uploadToCloudinary(file, 'driver-documents');
      setVaultDocs(prev => [...prev, { name: file.name, url: uploadResult.url }]);
      alert("✅ Document successfully uploaded to your secure Vault!");
    } catch (err) {
      alert("Failed to upload document to secure Vault");
    } finally {
      setUploadingVaultDoc(false);
    }
  };

  const refreshData = useCallback(() => {
    const allBookings = bookingsApi.getBookings();
    const myBookings = allBookings.filter(b => b.assigned_driver_id === driver.driver_id);
    setAssignedBookings(myBookings);

    const allVehs = fleetApi.getVehicles();
    setVehicles(allVehs);

    const myInspections = inspectionsApi.getInspections().filter(i => i.driver_id === driver.driver_id);
    setInspectionsList(myInspections);

    const myRecons = reconApi.getRecons(driver.driver_id);
    setRecons(myRecons);

    const myTransfers = transferReconApi.getRecons(driver.driver_id);
    setTransfersSheets(myTransfers);

    const checklists = checklistsApi.getChecklists(driver.driver_id);
    setDriverChecklists(checklists);

    const myFines = trafficFinesApi.getFines().filter(f => f.driver_id === driver.driver_id);
    setDriverFines(myFines);

    // Seed default selection for checklists
    if (allVehs.length > 0) {
      setReconForm(prev => ({ ...prev, vehicle_reg: allVehs[0].registration_no }));
      setExpenseForm(prev => ({ ...prev, vehicle_reg: allVehs[0].registration_no }));
      setIncidentForm(prev => ({ ...prev, vehicle_reg: allVehs[0].registration_no }));
    }
  }, [driver.driver_id]);

  // Initialize data
  useEffect(() => {
    // Wrap state initializations inside a timeout to prevent synchronous state changes inside effect body
    const timer = setTimeout(() => {
      refreshData();

      // Safely and purely initialize default form dates on client side
      const todayStr = new Date().toISOString().substring(0, 10);
      const endStr = new Date(new Date().getTime() + 6 * 24 * 3600 * 1000).toISOString().substring(0, 10);

      setReconForm(prev => ({
        ...prev,
        week_start: todayStr,
        week_end: endStr
      }));

      setTransferForm(prev => ({
        ...prev,
        week_start: todayStr,
        week_end: endStr
      }));

      setNewTransferRow(prev => ({
        ...prev,
        date: todayStr
      }));

      setExpenseForm(prev => ({
        ...prev,
        expense_date: todayStr
      }));

      setChecklistForm(prev => ({
        ...prev,
        week_start: todayStr,
        week_end: endStr
      }));
    }, 0);

    return () => clearTimeout(timer);
  }, [driver, refreshData]);

  // Pre-Trip / Post-Trip Inspections Submission
  const handleOpenInspection = (booking: Booking, type: 'pre-trip' | 'post-trip') => {
    setSelectedBookingForInspection(booking);
    setInspectionType(type);
    
    // Find matching vehicle and get its mileage
    const vehicle = vehicles.find(v => v.registration_no === booking.assigned_vehicle_reg);
    setInspectionMileage(vehicle ? vehicle.current_mileage : 120000);
    
    setInspectionChecklist({
      brakes: 'pass', steering: 'pass', tyres: 'pass', lights: 'pass', seatbelts: 'pass',
      windshield: 'pass', fluids: 'pass', horn: 'pass', bodywork: 'pass', emergency_kit: 'pass'
    });
    setInspectionFaults({});
    setInspectionNotes('');
    setInspectionSignature('');
    setInspectionMedia({});
    setUploadingMediaKeys({});
    setShowInspectionModal(true);
  };

  const handleInspectionChecklistChange = (item: string, rating: 'pass' | 'fail' | 'flag') => {
    setInspectionChecklist(prev => ({ ...prev, [item]: rating }));
  };

  const handleInspectionFaultChange = (item: string, desc: string) => {
    setInspectionFaults(prev => ({ ...prev, [item]: desc }));
  };

  const handleInspectionMediaUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingMediaKeys(prev => ({ ...prev, [key]: true }));
    try {
      const uploadResult = await uploadToCloudinary(file, 'inspections');
      setInspectionMedia(prev => ({ ...prev, [key]: uploadResult.url }));
    } catch (err) {
      alert("Failed to upload mechanical inspection proof photo");
    } finally {
      setUploadingMediaKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  const submitInspection = () => {
    if (!selectedBookingForInspection) return;

    // Check if critical faults were selected (any fail counts as critical)
    const hasCritical = Object.values(inspectionChecklist).some(rating => rating === 'fail');

    // Check if any uploads are still pending
    const isUploadingAny = Object.values(uploadingMediaKeys).some(Boolean);
    if (isUploadingAny) {
      alert("Please wait for your inspection photo uploads to complete before submitting.");
      return;
    }

    const newInspection: Inspection = {
      id: `ins-${Math.random().toString(36).substring(2, 9)}`,
      invoice_no: selectedBookingForInspection.invoice_no,
      vehicle_reg: selectedBookingForInspection.assigned_vehicle_reg || selectedBookingForInspection.rented_vehicle_reg || 'RENTED',
      driver_id: driver.driver_id,
      inspection_type: inspectionType,
      checklist_json: inspectionChecklist,
      faults_json: inspectionFaults,
      media_urls: inspectionMedia,
      mileage_at_inspection: inspectionMileage,
      notes: inspectionNotes,
      has_critical_fault: hasCritical,
      alert_sent: hasCritical, // Set true if there's a fault
      is_rented_vehicle: selectedBookingForInspection.is_rented_vehicle,
      rented_vehicle_model: selectedBookingForInspection.rented_vehicle_model,
      signature_url: inspectionSignature,
      created_at: new Date().toISOString()
    };

    inspectionsApi.saveInspection(newInspection);
    setShowInspectionModal(false);
    refreshData();
    
    if (hasCritical) {
      alert('⚠️ CRITICAL SAFETY FAULTS DETECTED! A real-time email notification alert has been logged for fleet managers. Please check vehicle immediately.');
    } else {
      alert('✅ Safety Checklist Submitted successfully!');
    }
  };

  // Weekly Recon Sheet Handlers
  const handleAddCustomCost = () => {
    if (!customCostDesc || !customCostAmount) return;
    const amount = Number(customCostAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newCost = {
      id: `cst-${Math.random().toString(36).substring(2, 6)}`,
      description: customCostDesc,
      amount
    };

    const costLines = [...(reconForm.cost_lines || []), newCost];
    setReconForm(prev => ({ ...prev, cost_lines: costLines }));
    setCustomCostDesc('');
    setCustomCostAmount('');
  };

  const handleRemoveCustomCost = (id: string) => {
    const costLines = (reconForm.cost_lines || []).filter(c => c.id !== id);
    setReconForm(prev => ({ ...prev, cost_lines: costLines }));
  };

  // Auto calculate net profit/loss
  const calculateReconTotal = (form: Partial<ReconSheet>) => {
    const budget = Number(form.trip_budget) || 0;
    const food = Number(form.driver_food) || 0;
    const flights = Number(form.flights_to_from) || 0;
    const rate = Number(form.driver_rate) || 0;
    const accommodation = Number(form.accommodation) || 0;
    const customSum = (form.cost_lines || []).reduce((acc, curr) => acc + curr.amount, 0);

    return budget - (food + flights + rate + accommodation + customSum);
  };

  const handleSaveRecon = (isSubmit: boolean) => {
    const netProfit = calculateReconTotal(reconForm);
    const startKm = Number(reconForm.start_km) || 0;
    const endKm = Number(reconForm.end_km) || 0;
    const totalDist = endKm - startKm;

    if (totalDist < 0) {
      alert('Error: End Mileage cannot be less than Start Mileage.');
      return;
    }

    const completedRecon: ReconSheet = {
      id: reconForm.id || `rec-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: driver.driver_id,
      week_start: reconForm.week_start || '',
      week_end: reconForm.week_end || '',
      tour_reference: reconForm.tour_reference || '',
      vehicle_reg: reconForm.vehicle_reg || '',
      start_km: startKm,
      end_km: endKm,
      total_distance_km: totalDist,
      trips_completed: Number(reconForm.trips_completed) || 0,
      total_hours: Number(reconForm.total_hours) || 0,
      cost_lines: reconForm.cost_lines || [],
      trip_budget: Number(reconForm.trip_budget) || 0,
      driver_food: Number(reconForm.driver_food) || 0,
      flights_to_from: Number(reconForm.flights_to_from) || 0,
      driver_rate: Number(reconForm.driver_rate) || 0,
      accommodation: Number(reconForm.accommodation) || 0,
      total_profit_loss: netProfit,
      director_sign_off: false,
      vehicle_issues: reconForm.vehicle_issues || '',
      accidents_incidents: reconForm.accidents_incidents || '',
      traffic_violations: reconForm.traffic_violations || '',
      safety_concerns: reconForm.safety_concerns || '',
      maintenance_needed: reconForm.maintenance_needed || '',
      fuel_consumption: reconForm.fuel_consumption || '',
      tires_condition: reconForm.tires_condition || '',
      fatigue_level: Number(reconForm.fatigue_level) || 5,
      stress_level: Number(reconForm.stress_level) || 5,
      health_issues: reconForm.health_issues || '',
      driver_notes: reconForm.driver_notes || '',
      slip_image_urls: reconForm.slip_image_urls || [],
      edit_request_status: 'none',
      status: isSubmit ? 'submitted' : 'draft',
      submitted_at: isSubmit ? new Date().toISOString() : undefined,
      created_at: reconForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    reconApi.saveRecon(completedRecon);
    setShowNewRecon(false);
    refreshData();
    alert(isSubmit ? '🚀 Trip Recon Sheet submitted to Directors!' : '💾 Draft saved locally.');
  };

  const handleRequestEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReconForEditRequest || !editRequestReason) return;

    reconApi.requestEdit(activeReconForEditRequest, editRequestReason);
    setActiveReconForEditRequest(null);
    setEditRequestReason('');
    refreshData();
    alert('📩 Edit request submitted to Administrator.');
  };

  // Transfer sheet helpers
  const handleAddTransferRow = () => {
    if (!newTransferRow.passenger_name || !newTransferRow.amount) return;
    const amount = Number(newTransferRow.amount);
    if (isNaN(amount) || amount <= 0) return;

    const newRow = {
      id: `tr-${Math.random().toString(36).substring(2, 6)}`,
      date: newTransferRow.date,
      passenger_name: newTransferRow.passenger_name,
      pickup_location: newTransferRow.pickup_location || 'Aerodrome',
      dropoff_location: newTransferRow.dropoff_location || 'Hotel',
      amount,
      invoice_or_tour_ref: newTransferRow.invoice_or_tour_ref || 'TRF-MOCK'
    };

    const transfers = [...(transferForm.transfers || []), newRow];
    setTransferForm(prev => ({ ...prev, transfers }));
    setNewTransferRow({
      date: new Date().toISOString().substring(0, 10),
      passenger_name: '',
      pickup_location: '',
      dropoff_location: '',
      amount: '',
      invoice_or_tour_ref: ''
    });
  };

  const handleRemoveTransferRow = (id: string) => {
    const transfers = (transferForm.transfers || []).filter(t => t.id !== id);
    setTransferForm(prev => ({ ...prev, transfers }));
  };

  const handleSaveTransferSheet = (isSubmit: boolean) => {
    const list = transferForm.transfers || [];
    if (list.length === 0) {
      alert('Please log at least 1 transfer record before saving.');
      return;
    }

    const completed: TransferReconSheet = {
      id: transferForm.id || `trf-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: driver.driver_id,
      week_start: transferForm.week_start || '',
      week_end: transferForm.week_end || '',
      transfers: list,
      status: isSubmit ? 'submitted' : 'draft',
      edit_request_status: 'none',
      submitted_at: isSubmit ? new Date().toISOString() : undefined,
      created_at: transferForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    transferReconApi.saveRecon(completed);
    setShowNewTransferSheet(false);
    refreshData();
    alert(isSubmit ? '🚀 Transfer sheet submitted to Directors!' : '💾 Draft saved locally.');
  };

  const handleTransferEditRequest = (id: string, reason: string) => {
    transferReconApi.requestEdit(id, reason);
    refreshData();
    alert('📩 Edit request submitted to Administrator.');
  };

  // Log expense, incident and periodic checklists
  const handleLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(expenseForm.amount);
    if (!expenseForm.vehicle_reg || isNaN(amount) || amount <= 0) {
      alert('Please fill valid vehicle registration and positive amount.');
      return;
    }

    expensesApi.saveExpense({
      id: `exp-${Math.random().toString(36).substring(2, 9)}`,
      vehicle_reg: expenseForm.vehicle_reg,
      driver_id: driver.driver_id,
      expense_type: expenseForm.expense_type,
      description: expenseForm.description,
      amount,
      expense_date: expenseForm.expense_date,
      document_urls: expenseUrl ? [expenseUrl] : [],
      photo_urls: expenseUrl ? [expenseUrl] : [],
      status: 'pending',
      submitted_at: new Date().toISOString(),
      alert_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    setExpenseForm({
      vehicle_reg: vehicles[0]?.registration_no || '',
      expense_type: 'Other',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().substring(0, 10)
    });
    setExpenseUrl('');
    alert('✅ Expense receipt uploaded and pending approval!');
  };

  const handleLogIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.description || !incidentForm.vehicle_reg) return;

    incidentsApi.saveIncident({
      id: `inc-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: driver.driver_id,
      vehicle_reg: incidentForm.vehicle_reg,
      incident_type: incidentForm.incident_type,
      description: incidentForm.description,
      location: incidentForm.location,
      injuries: incidentForm.injuries,
      photo_urls: incidentUrl ? [incidentUrl] : [],
      document_urls: incidentUrl ? [incidentUrl] : [],
      status: 'reported',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    setIncidentForm({
      vehicle_reg: vehicles[0]?.registration_no || '',
      incident_type: 'Accident',
      description: '',
      location: '',
      injuries: false
    });
    setIncidentUrl('');
    alert('⚠️ Incident filed! Directors have been notified.');
  };

  const handleChecklistValueChange = (item: string, val: 'ok' | 'low' | 'action') => {
    setChecklistForm(prev => {
      const data = { ...(prev.checklist_data || {}) } as any;
      data[item] = val;
      return { ...prev, checklist_data: data } as Partial<VehicleChecklist>;
    });
  };

  const submitPeriodicChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistForm.mileage) {
      alert('Please fill current mileage.');
      return;
    }

    const newChecklist: VehicleChecklist = {
      id: `chk-${Math.random().toString(36).substring(2, 9)}`,
      driver_id: driver.driver_id,
      week_start: checklistForm.week_start || '',
      week_end: checklistForm.week_end || '',
      status: 'submitted',
      checklist_data: checklistForm.checklist_data as any,
      mileage: Number(checklistForm.mileage),
      notes: checklistForm.notes,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    checklistsApi.saveChecklist(newChecklist);
    refreshData();
    alert('✅ Weekly Vehicle Condition checklist logged successfully.');
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-20 font-sans text-slate-100 selection:bg-teal-500 selection:text-white">
      
      {/* Dynamic Header */}
      <header className="bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-teal-600 p-1.5 rounded-lg text-white font-extrabold tracking-tight">IN</div>
          <div>
            <h1 className="text-xs font-black tracking-widest text-slate-400">INYATHI PWA</h1>
            <p className="text-sm font-bold text-teal-400">{driver.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-700 text-teal-300">
            {driver.driver_id} • {driver.location}
          </span>
          <button
            onClick={onLogout}
            className="p-1.5 text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        
        {/* ==================== TASKS TAB ==================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Compass className="w-5 h-5 text-teal-500 animate-spin-slow" />
                My Assigned Tours
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {assignedBookings.length} Active Trip{assignedBookings.length !== 1 ? 's' : ''}
              </span>
            </div>

            {assignedBookings.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800/80 p-8 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-medium">No tours assigned to you right now.</p>
                <p className="text-[10px] text-teal-500/80 mt-1 italic">Contact dispatch to check vehicle scheduling.</p>
              </div>
            ) : (
              assignedBookings.map(b => (
                <div key={b.invoice_no} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold uppercase bg-teal-900/40 text-teal-300 border border-teal-800/60 px-2 py-0.5 rounded">
                        {b.invoice_no}
                      </span>
                      <h3 className="text-sm font-extrabold text-white mt-1.5 leading-snug">{b.client_name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">{b.route}</p>
                    </div>
                    <span className="text-xs font-bold text-teal-400">
                      {b.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[9px]">Tour Code</p>
                      <p className="text-slate-300 font-bold">{b.tour_reference}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase text-[9px]">Vehicle Assigned</p>
                      <p className="text-slate-300 font-bold">
                        {b.is_rented_vehicle ? `${b.rented_vehicle_model} (RENTED)` : b.assigned_vehicle_reg}
                      </p>
                    </div>
                    <div className="mt-1.5">
                      <p className="text-slate-500 font-bold uppercase text-[9px]">Departure</p>
                      <p className="text-slate-300 font-medium">{new Date(b.start_date).toLocaleString()}</p>
                    </div>
                    <div className="mt-1.5">
                      <p className="text-slate-500 font-bold uppercase text-[9px]">Return</p>
                      <p className="text-slate-300 font-medium">{new Date(b.end_date).toLocaleString()}</p>
                    </div>
                  </div>

                  {b.notes && (
                    <div className="text-[10px] text-slate-400 italic bg-slate-900 border-l-2 border-slate-700 py-1.5 px-2 rounded-r">
                      💡 Notes: {b.notes}
                    </div>
                  )}

                  {b.booking_documents && b.booking_documents.length > 0 && (
                    <div className="space-y-1 bg-slate-900/50 p-2 border border-slate-800 rounded">
                      <span className="text-[9px] text-teal-400 font-bold block">Assigned Booking Documents:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {b.booking_documents.map((doc, idx) => (
                          <button
                            key={idx}
                            onClick={async () => {
                              const signed = await getSignedUrlForView(doc.url);
                              window.open(signed, '_blank');
                            }}
                            className="text-[9px] text-teal-400 font-black hover:underline bg-teal-950/20 px-1.5 py-0.5 rounded border border-teal-900 cursor-pointer"
                          >
                            📄 {doc.filename || `Document #${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operational actions: Itinerary, pre-trip, post-trip checks */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <button
                      onClick={async () => {
                        if (b.itinerary_url) {
                          const signedUrl = await getSignedUrlForView(b.itinerary_url);
                          window.open(signedUrl, '_blank');
                        } else {
                          alert(`📋 No itinerary file has been uploaded for this booking yet.`);
                        }
                      }}
                      className="text-xs font-semibold py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg transition-colors border border-slate-700 text-center cursor-pointer"
                    >
                      🗺️ View Itinerary
                    </button>
                    <button
                      onClick={() => handleOpenInspection(b, 'pre-trip')}
                      className="text-xs font-semibold py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-all shadow-md text-center"
                    >
                      🛡️ Pre-Trip Safety Check
                    </button>
                    <button
                      onClick={() => handleOpenInspection(b, 'post-trip')}
                      className="col-span-2 text-xs font-semibold py-2 bg-slate-900 hover:bg-slate-850 text-rose-400 hover:text-rose-300 border border-slate-800 rounded-lg transition-colors text-center"
                    >
                      ⚠️ Log Post-Trip Checklist
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Past Inspections Checklist */}
            <div className="pt-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">My Inspections History</h3>
              {inspectionsList.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No safety checks logged yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {inspectionsList.map(ins => (
                    <div key={ins.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] flex justify-between items-center">
                      <div>
                        <p className="font-extrabold text-white">{ins.inspection_type.toUpperCase()} • {ins.invoice_no}</p>
                        <p className="text-slate-400 text-[10px]">
                          {ins.vehicle_reg} • Mileage: {ins.mileage_at_inspection} km • {new Date(ins.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadInspectionPDF(ins, driver.name)}
                        className="text-[10px] font-bold text-teal-400 hover:underline bg-teal-950/60 py-1 px-2 rounded border border-teal-800"
                      >
                        PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== WEEKLY RECON TAB ==================== */}
        {activeTab === 'recon' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-teal-500" />
                Weekly Cost Recons
              </h2>
              {!showNewRecon && (
                <button
                  onClick={() => {
                    setReconForm({
                      week_start: new Date().toISOString().substring(0, 10),
                      week_end: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().substring(0, 10),
                      tour_reference: '',
                      vehicle_reg: vehicles[0]?.registration_no || '',
                      start_km: 0,
                      end_km: 0,
                      total_distance_km: 0,
                      trips_completed: 0,
                      total_hours: 0,
                      cost_lines: [],
                      trip_budget: 0,
                      driver_food: 0,
                      flights_to_from: 0,
                      driver_rate: 0,
                      accommodation: 0,
                      total_profit_loss: 0,
                      vehicle_issues: '',
                      accidents_incidents: '',
                      traffic_violations: '',
                      safety_concerns: '',
                      maintenance_needed: '',
                      fuel_consumption: '',
                      tires_condition: '',
                      fatigue_level: 5,
                      stress_level: 5,
                      health_issues: '',
                      driver_notes: '',
                      slip_image_urls: []
                    });
                    setShowNewRecon(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Recon
                </button>
              )}
            </div>

            {/* CREATE / EDIT RECON VIEW */}
            {showNewRecon ? (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs uppercase tracking-wider font-extrabold text-teal-400">New Weekly trip Recon</h3>
                  <button
                    onClick={() => setShowNewRecon(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>

                {/* Week Start & End dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Week Start</label>
                    <input
                      type="date"
                      value={reconForm.week_start}
                      onChange={(e) => setReconForm(prev => ({ ...prev, week_start: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Week End</label>
                    <input
                      type="date"
                      value={reconForm.week_end}
                      onChange={(e) => setReconForm(prev => ({ ...prev, week_end: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Tour Ref and Vehicle Select */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Tour Ref / Code</label>
                    <input
                      type="text"
                      placeholder="e.g. WINELANDS-88A"
                      value={reconForm.tour_reference}
                      onChange={(e) => setReconForm(prev => ({ ...prev, tour_reference: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Vehicle Reg</label>
                    <select
                      value={reconForm.vehicle_reg}
                      onChange={(e) => setReconForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    >
                      {vehicles.map(v => (
                        <option key={v.registration_no} value={v.registration_no}>
                          {v.registration_no} ({v.model})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mileage and stats */}
                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Start KM</label>
                    <input
                      type="number"
                      value={reconForm.start_km || ''}
                      onChange={(e) => setReconForm(prev => ({ ...prev, start_km: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">End KM</label>
                    <input
                      type="number"
                      value={reconForm.end_km || ''}
                      onChange={(e) => setReconForm(prev => ({ ...prev, end_km: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Total KM</label>
                    <div className="w-full bg-slate-950/40 p-1 text-xs text-slate-400 font-black text-center mt-0.5 rounded border border-slate-800">
                      {((reconForm.end_km || 0) - (reconForm.start_km || 0)) || 0} km
                    </div>
                  </div>
                  <div className="mt-1.5 col-span-2">
                    <label className="text-[9px] font-bold uppercase text-slate-500">Total Hours Driven</label>
                    <input
                      type="number"
                      value={reconForm.total_hours || ''}
                      onChange={(e) => setReconForm(prev => ({ ...prev, total_hours: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-bold"
                    />
                  </div>
                  <div className="mt-1.5">
                    <label className="text-[9px] font-bold uppercase text-slate-500">Trips Run</label>
                    <input
                      type="number"
                      value={reconForm.trips_completed || ''}
                      onChange={(e) => setReconForm(prev => ({ ...prev, trips_completed: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-bold"
                    />
                  </div>
                </div>

                {/* Financial line items */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase text-teal-400">Core Tour Finances</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Trip Budget Received</span>
                      <input
                        type="number"
                        placeholder="ZAR Allocation"
                        value={reconForm.trip_budget || ''}
                        onChange={(e) => setReconForm(prev => ({ ...prev, trip_budget: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">My Daily Rate Claim</span>
                      <input
                        type="number"
                        placeholder="Wages"
                        value={reconForm.driver_rate || ''}
                        onChange={(e) => setReconForm(prev => ({ ...prev, driver_rate: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Food Allowance</span>
                      <input
                        type="number"
                        value={reconForm.driver_food || ''}
                        onChange={(e) => setReconForm(prev => ({ ...prev, driver_food: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Accommodation Cost</span>
                      <input
                        type="number"
                        value={reconForm.accommodation || ''}
                        onChange={(e) => setReconForm(prev => ({ ...prev, accommodation: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Expenses List */}
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <h4 className="text-[10px] font-bold uppercase text-teal-400">Other Custom Trip Expenses</h4>
                  {(reconForm.cost_lines || []).length > 0 && (
                    <div className="space-y-1 bg-slate-900 p-2 rounded border border-slate-800">
                      {(reconForm.cost_lines || []).map(line => (
                        <div key={line.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">{line.description}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-white">R {line.amount}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomCost(line.id)}
                              className="text-rose-400 hover:text-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Toll Gate Fees"
                      value={customCostDesc}
                      onChange={(e) => setCustomCostDesc(e.target.value)}
                      className="col-span-2 bg-slate-900 border border-slate-800 rounded p-1 text-xs text-white"
                    />
                    <input
                      type="number"
                      placeholder="Amount ZAR"
                      value={customCostAmount}
                      onChange={(e) => setCustomCostAmount(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCost}
                      className="col-span-3 text-[10px] font-bold text-center bg-slate-800 hover:bg-slate-700 py-1.5 rounded transition-colors text-teal-300 flex items-center justify-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Custom Cost Line
                    </button>
                  </div>
                </div>

                {/* Wellness fields */}
                <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
                  <h4 className="text-[10px] font-bold uppercase text-teal-400">My Wellness & Condition Log</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span>Fatigue Level (1-10)</span>
                      <input
                        type="range" min="1" max="10"
                        value={reconForm.fatigue_level}
                        onChange={(e) => setReconForm(prev => ({ ...prev, fatigue_level: Number(e.target.value) }))}
                        className="w-full accent-teal-600"
                      />
                      <span className="text-[9px] text-slate-400 text-right block font-black">Level: {reconForm.fatigue_level}/10</span>
                    </div>
                    <div>
                      <span>Stress Level (1-10)</span>
                      <input
                        type="range" min="1" max="10"
                        value={reconForm.stress_level}
                        onChange={(e) => setReconForm(prev => ({ ...prev, stress_level: Number(e.target.value) }))}
                        className="w-full accent-teal-600"
                      />
                      <span className="text-[9px] text-slate-400 text-right block font-black">Level: {reconForm.stress_level}/10</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text" placeholder="Vehicle Issues? (e.g. steering tight, AC weak)"
                      value={reconForm.vehicle_issues}
                      onChange={(e) => setReconForm(prev => ({ ...prev, vehicle_issues: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                    <input
                      type="text" placeholder="Accidents / Traffic violations? (details)"
                      value={reconForm.accidents_incidents}
                      onChange={(e) => setReconForm(prev => ({ ...prev, accidents_incidents: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                    <textarea
                      placeholder="General driver notes / wellness comments"
                      value={reconForm.driver_notes}
                      onChange={(e) => setReconForm(prev => ({ ...prev, driver_notes: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white h-12"
                    />
                  </div>
                </div>

                {/* Subtotals display */}
                <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Projected Balance</span>
                    <p className={`text-sm font-black ${calculateReconTotal(reconForm) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R {calculateReconTotal(reconForm).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSaveRecon(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded text-xs transition-colors"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveRecon(true)}
                      className="bg-teal-600 hover:bg-teal-500 text-white font-black py-1.5 px-4 rounded text-xs transition-colors shadow"
                    >
                      Submit Sheet
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* RECONS LIST VIEW */
              <div className="space-y-2">
                {recons.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">No reconciliation sheets logged yet.</p>
                ) : (
                  recons.map(rec => (
                    <div key={rec.id} className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[11px] font-black text-slate-400">Period: {rec.week_start} - {rec.week_end}</p>
                          <h4 className="text-xs font-bold text-white mt-0.5">Tour Code: {rec.tour_reference || 'N/A'}</h4>
                        </div>
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                          rec.status === 'reviewed'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                            : rec.status === 'submitted'
                            ? 'bg-teal-950/60 text-teal-300 border-teal-800/80'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {rec.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 border-t border-b border-slate-900 py-2 my-1">
                        <div>
                          <span className="block text-[8px] uppercase text-slate-500">Distance</span>
                          <span className="font-bold text-slate-300">{rec.total_distance_km} km</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-slate-500">Trip Expenses</span>
                          <span className="font-bold text-slate-300">R {(Number(rec.trip_budget || 0) - Number(rec.total_profit_loss || 0)).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-slate-500">Net Return</span>
                          <span className={`font-bold ${Number(rec.total_profit_loss || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            R {Number(rec.total_profit_loss || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {rec.edit_request_status && rec.edit_request_status !== 'none' && (
                        <div className="text-[10px] bg-slate-900 px-2 py-1.5 rounded flex items-center justify-between border border-slate-800">
                          <span className="text-slate-400">Edit request status:</span>
                          <span className={`font-bold uppercase text-[9px] ${
                            rec.edit_request_status === 'pending' ? 'text-amber-400' : rec.edit_request_status === 'approved' ? 'text-teal-400' : 'text-rose-400'
                          }`}>
                            {rec.edit_request_status}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-1.5 pt-1.5 justify-end">
                        <button
                          onClick={() => downloadReconPDF(rec, driver.name)}
                          className="text-[10px] font-bold text-teal-400 hover:bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Download PDF Report
                        </button>

                        {rec.status === 'draft' && (
                          <button
                            onClick={() => {
                              setReconForm(rec);
                              setShowNewRecon(true);
                            }}
                            className="bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all"
                          >
                            Edit Draft
                          </button>
                        )}

                        {rec.status === 'submitted' && rec.edit_request_status === 'none' && (
                          <button
                            onClick={() => setActiveReconForEditRequest(rec.id)}
                            className="text-[10px] font-bold text-amber-400 hover:bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Request Edit
                          </button>
                        )}
                      </div>

                      {/* Request Edit Dialog inline */}
                      {activeReconForEditRequest === rec.id && (
                        <form onSubmit={handleRequestEdit} className="mt-2.5 p-3 border border-slate-800 rounded bg-slate-950 shadow space-y-2 animate-scale-up">
                          <p className="text-[9px] font-bold uppercase text-amber-400">Request Edit Authorization</p>
                          <input
                            type="text"
                            required
                            placeholder="Enter detailed reason for editing..."
                            value={editRequestReason}
                            onChange={(e) => setEditRequestReason(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                          />
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => setActiveReconForEditRequest(null)}
                              className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-amber-600 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors"
                            >
                              Submit Request
                            </button>
                          </div>
                        </form>
                      )}

                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

        {/* ==================== TRANSFER RECON TAB ==================== */}
        {activeTab === 'transfer' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-teal-500" />
                Transfer Payment Recons
              </h2>
              {!showNewTransferSheet && (
                <button
                  onClick={() => {
                    setTransferForm({
                      week_start: new Date().toISOString().substring(0, 10),
                      week_end: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().substring(0, 10),
                      transfers: []
                    });
                    setShowNewTransferSheet(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Transfer Recon
                </button>
              )}
            </div>

            {showNewTransferSheet ? (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs uppercase tracking-wider font-extrabold text-teal-400">Weekly transfers list</h3>
                  <button
                    onClick={() => setShowNewTransferSheet(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Week Start</label>
                    <input
                      type="date"
                      value={transferForm.week_start}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, week_start: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Week End</label>
                    <input
                      type="date"
                      value={transferForm.week_end}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, week_end: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Transfers rows itemizer */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase text-teal-400">Passenger Transfer log</h4>
                  
                  {/* Existing logged transfers */}
                  {(transferForm.transfers || []).length > 0 && (
                    <div className="space-y-1.5 bg-slate-900 p-2 rounded border border-slate-800 max-h-48 overflow-y-auto">
                      {(transferForm.transfers || []).map((t) => (
                        <div key={t.id} className="flex justify-between items-start text-xs border-b border-slate-800/60 pb-1.5">
                          <div>
                            <p className="font-extrabold text-white">{t.passenger_name}</p>
                            <p className="text-[10px] text-slate-400">{t.date} • {t.pickup_location} → {t.dropoff_location}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-teal-400">R {t.amount}</span>
                            <button
                              onClick={() => handleRemoveTransferRow(t.id)}
                              className="text-rose-400 hover:text-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New transfer row */}
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Log Transfer Record</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={newTransferRow.date}
                        onChange={(e) => setNewTransferRow(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Passenger Name"
                        value={newTransferRow.passenger_name}
                        onChange={(e) => setNewTransferRow(prev => ({ ...prev, passenger_name: e.target.value }))}
                        className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Pickup Location"
                        value={newTransferRow.pickup_location}
                        onChange={(e) => setNewTransferRow(prev => ({ ...prev, pickup_location: e.target.value }))}
                        className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Dropoff Location"
                        value={newTransferRow.dropoff_location}
                        onChange={(e) => setNewTransferRow(prev => ({ ...prev, dropoff_location: e.target.value }))}
                        className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="ZAR Amount"
                        value={newTransferRow.amount}
                        onChange={(e) => setNewTransferRow(prev => ({ ...prev, amount: e.target.value }))}
                        className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Tour Code Reference"
                        value={newTransferRow.invoice_or_tour_ref}
                        onChange={(e) => setNewTransferRow(prev => ({ ...prev, invoice_or_tour_ref: e.target.value }))}
                        className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTransferRow}
                      className="w-full text-center bg-slate-950 hover:bg-slate-800 py-1.5 rounded text-teal-400 font-bold flex items-center justify-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add to Weekly Sheet
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end border-t border-slate-800 pt-3">
                  <button
                    onClick={() => handleSaveTransferSheet(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded text-xs transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => handleSaveTransferSheet(true)}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-black py-1.5 px-4 rounded text-xs transition-colors shadow"
                  >
                    Submit Sheet
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {transfersSheets.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">No transfer sheets submitted yet.</p>
                ) : (
                  transfersSheets.map(ts => (
                    <div key={ts.id} className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <p className="text-[11px] font-black text-slate-400">Week: {ts.week_start} - {ts.week_end}</p>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                          ts.status === 'reviewed' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {ts.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                        <span>Passenger Transfers: <strong className="text-white">{ts.transfers.length}</strong></span>
                        <span>Total Wage Earnings: <strong className="text-teal-400">R {ts.transfers.reduce((sum, curr) => sum + Number(curr.amount || 0), 0).toFixed(2)}</strong></span>
                      </div>

                      <div className="flex gap-1.5 pt-1.5 justify-end">
                        <button
                          onClick={() => downloadTransferReconPDF(ts, driver.name)}
                          className="text-[10px] font-bold text-teal-400 hover:bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          PDF Report
                        </button>
                        
                        {ts.status === 'draft' && (
                          <button
                            onClick={() => {
                              setTransferForm(ts);
                              setShowNewTransferSheet(true);
                            }}
                            className="bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all"
                          >
                            Edit Sheet
                          </button>
                        )}

                        {ts.status === 'submitted' && ts.edit_request_status === 'none' && (
                          <button
                            onClick={() => {
                              const reason = prompt('Please enter edit request reason:');
                              if (reason) handleTransferEditRequest(ts.id, reason);
                            }}
                            className="text-[10px] font-bold text-amber-400 hover:bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Request Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

        {/* ==================== LOGGING CENTER TAB ==================== */}
        {activeTab === 'logging' && (
          <div className="space-y-4">
            
            {/* EXPENSES LOGGING */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                <Camera className="w-4 h-4 text-teal-500" />
                Upload slip / Receipt Expense
              </h3>
              <form onSubmit={handleLogExpense} className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={expenseForm.vehicle_reg}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.registration_no} value={v.registration_no}>{v.registration_no}</option>
                    ))}
                  </select>
                  <select
                    value={expenseForm.expense_type}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_type: e.target.value as any }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="Tyres">Tyres</option>
                    <option value="Service">Service</option>
                    <option value="Damage">Damage</option>
                    <option value="Repair">Repair</option>
                    <option value="Accident">Accident</option>
                    <option value="Other">Other Expense</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number" required placeholder="ZAR Amount"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="col-span-2 bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                  />
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                  />
                </div>
                <input
                  type="text" required placeholder="Expense description (e.g. Fuel tank top-up)"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                />
                
                {/* Real Cloudinary file selector */}
                <div className="border border-dashed border-slate-700 bg-slate-900 p-3 text-center rounded-xl flex flex-col items-center justify-center gap-2 relative">
                  {uploadingFile ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-teal-400 font-bold justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> Uploading to Cloudinary...
                    </div>
                  ) : expenseUrl ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400 font-extrabold truncate max-w-[200px]">Uploaded: {expenseUrl.split('/').pop()}</span>
                      <button type="button" onClick={() => setExpenseUrl('')} className="text-[9px] text-rose-400 hover:underline">Remove</button>
                    </div>
                  ) : (
                    <>
                      <FileUp className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] text-slate-400 block">Select Slip / Receipt File</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleExpenseFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  File Expense Slip
                </button>
              </form>
            </div>

            {/* PERIODIC SAFETY CHECKLISTS FORM */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                <ClipboardCheck className="w-4 h-4 text-teal-500" />
                Submit Periodic Vehicle Checklist
              </h3>
              <form onSubmit={submitPeriodicChecklist} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Current Mileage (km)</span>
                    <input
                      type="number" required placeholder="e.g. 124000"
                      value={checklistForm.mileage || ''}
                      onChange={(e) => setChecklistForm(prev => ({ ...prev, mileage: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Start Date</span>
                    <input
                      type="date"
                      value={checklistForm.week_start}
                      onChange={(e) => setChecklistForm(prev => ({ ...prev, week_start: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                    />
                  </div>
                </div>

                {/* 12 check points rating */}
                <div className="space-y-1.5 border border-slate-800 rounded bg-slate-900/60 p-2">
                  <p className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-800 pb-1 mb-1.5">Rating Audit</p>
                  
                  {Object.keys(checklistForm.checklist_data || {}).map(key => {
                    const cleanKey = key.replace(/_/g, ' ');
                    const ratingValue = (checklistForm.checklist_data as any)[key];
                    const isOk = ratingValue === 'ok';

                    return (
                      <div key={key} className="flex justify-between items-center text-[10px] py-1 border-b border-slate-950 last:border-0">
                        <span className="text-slate-300 capitalize">{cleanKey}</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleChecklistValueChange(key, 'ok')}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                              isOk ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChecklistValueChange(key, key.includes('tyre') || key.includes('light') ? 'action' : 'low')}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                              !isOk ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            WARN
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <textarea
                  placeholder="Notes / Issues noticed during audit checklist"
                  value={checklistForm.notes}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white h-12"
                />

                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  File Checklist
                </button>
              </form>
            </div>

            {/* INCIDENT REPORT FORM */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Report Accident / Road Incident
              </h3>
              <form onSubmit={handleLogIncident} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={incidentForm.vehicle_reg}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.registration_no} value={v.registration_no}>{v.registration_no}</option>
                    ))}
                  </select>
                  <select
                    value={incidentForm.incident_type}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, incident_type: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="Accident">Accident / Collision</option>
                    <option value="Breakdown">Breakdown</option>
                    <option value="Injury">Medical / Passenger Injury</option>
                    <option value="Theft">Vandalism / Theft</option>
                  </select>
                </div>
                <input
                  type="text" required placeholder="Incident Location (e.g. N1 highway outbound)"
                  value={incidentForm.location}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                />
                
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                  <input
                    type="checkbox" id="injuries-chk"
                    checked={incidentForm.injuries}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, injuries: e.target.checked }))}
                    className="accent-teal-600 w-4 h-4"
                  />
                  <label htmlFor="injuries-chk" className="text-slate-300 font-bold">Passenger or Driver Injuries occurred?</label>
                </div>

                <textarea
                  required placeholder="Detailed description of what occurred, damage, next actions..."
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white h-20"
                />

                {/* Real Cloudinary file selector for Incidents */}
                <div className="border border-dashed border-slate-700 bg-slate-900 p-3 text-center rounded-xl flex flex-col items-center justify-center gap-2 relative">
                  {uploadingIncident ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-teal-400 font-bold justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> Uploading photo...
                    </div>
                  ) : incidentUrl ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400 font-extrabold truncate max-w-[200px]">Uploaded: {incidentUrl.split('/').pop()}</span>
                      <button type="button" onClick={() => setIncidentUrl('')} className="text-[9px] text-rose-400 hover:underline">Remove</button>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] text-slate-400 block">Select Incident Photo / Document</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleIncidentFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-md"
                >
                  File Urgent Incident Report
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ==================== DOCUMENTS TAB ==================== */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold flex items-center gap-1.5">
              <Briefcase className="w-5 h-5 text-teal-500" />
              My Document Vault
            </h2>
            <p className="text-[10px] text-slate-400">
              Aggregated repository of tour manifests, itineraries, signed compliance checks, and weekly payroll spreadsheets.
            </p>

            {/* Compliance Document Uploader */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3 shadow-md">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileUp className="w-4 h-4 text-teal-400" />
                Upload New Compliance / Manifest Document to Vault
              </p>
              <div className="border border-dashed border-slate-700 bg-slate-900 p-4 text-center rounded-xl flex flex-col items-center justify-center gap-2 relative">
                {uploadingVaultDoc ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-teal-400 font-bold justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-400" /> Uploading to secure vault...
                  </div>
                ) : (
                  <>
                    <FileUp className="w-6 h-6 text-slate-400" />
                    <span className="text-[10px] text-slate-400 block font-medium">Drag & drop or Click to select document</span>
                    <span className="text-[8px] text-slate-500 block">PDFs, PNG, JPG accepted</span>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handleVaultFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Dynamic Vault Documents list */}
              {vaultDocs.map((doc, index) => (
                <div key={index} className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-center justify-between shadow-lg">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-xs font-bold text-teal-400 truncate">{doc.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono truncate">{doc.url}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const signedUrl = await getSignedUrlForView(doc.url);
                      window.open(signedUrl, '_blank');
                    }}
                    className="text-xs font-bold text-teal-400 hover:underline border border-teal-800 px-3 py-1 rounded bg-teal-950/20 hover:bg-teal-950/40 transition-colors whitespace-nowrap"
                  >
                    Download
                  </button>
                </div>
              ))}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Driver Contract Agreement</p>
                  <p className="text-[9px] text-slate-500">Employment_Contract_{driver.driver_id}.pdf</p>
                </div>
                <button
                  onClick={() => alert('📥 Downloader: Simulated downloading of Driver Employment Contract Agreement.')}
                  className="text-xs font-bold text-teal-400 hover:underline border border-teal-800 px-2.5 py-1 rounded hover:bg-teal-950/20"
                >
                  Download
                </button>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Medical & Insurance Compliance Cover</p>
                  <p className="text-[9px] text-slate-500">Inyathi_Fleet_Insurance_Details.pdf</p>
                </div>
                <button
                  onClick={() => alert('📥 Downloader: Simulated downloading of Medical & Insurance compliance certificate.')}
                  className="text-xs font-bold text-teal-400 hover:underline border border-teal-800 px-2.5 py-1 rounded hover:bg-teal-950/20"
                >
                  Download
                </button>
              </div>

              {driverChecklists.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-400 mb-2">My Weekly Audited Checklists</h3>
                  <div className="space-y-1.5">
                    {driverChecklists.map(c => (
                      <div key={c.id} className="bg-slate-950 p-2.5 border border-slate-800 rounded-lg flex justify-between items-center text-[11px]">
                        <div>
                          <p className="font-extrabold text-white">Period: {c.week_start} - {c.week_end}</p>
                          <p className="text-slate-400 text-[10px]">Mileage: {c.mileage} km</p>
                        </div>
                        <button
                          onClick={() => downloadChecklistPDF(c, driver.name)}
                          className="text-xs text-teal-400 hover:underline bg-teal-950/40 border border-teal-850 px-2 py-0.5 rounded"
                        >
                          PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Traffic Fines Tracking */}
              <div className="pt-4 border-t border-slate-800/80 mt-2">
                <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Traffic Fines & Violations Ledger
                </h3>
                {driverFines.length === 0 ? (
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center">
                    <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Perfect Driving Record
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">No recorded traffic fines or violations found on your profile. Thank you for driving safely!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {driverFines.map(f => (
                      <div key={f.id} className="bg-slate-950 p-3.5 border border-slate-800 rounded-xl space-y-2 text-[11px]">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-white block text-xs">{f.fine_reference}</span>
                            <span className="text-slate-500 text-[9px] font-mono block mt-0.5">Vehicle: {f.vehicle_reg}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-rose-400 block">R {f.amount}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold mt-1 border ${
                              f.status === 'paid'
                                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/60'
                                : 'bg-amber-950/30 text-amber-400 border-amber-900/60 animate-pulse'
                            }`}>
                              {f.status === 'paid' ? 'Paid / Settled' : 'Unpaid / Action Required'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px] bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                          <div>
                            <span className="text-slate-500 block">Date & Time</span>
                            <span className="text-slate-300 font-medium">{new Date(f.fine_timestamp).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Location</span>
                            <span className="text-slate-300 font-medium truncate block" title={f.location}>{f.location}</span>
                          </div>
                        </div>

                        {f.description && (
                          <p className="text-slate-400 leading-relaxed text-[10px] bg-slate-900/30 px-2 py-1 rounded">
                            <strong className="text-slate-500 text-[9px] uppercase tracking-wider block">Violation Details</strong>
                            {f.description}
                          </p>
                        )}

                        <div className="text-[9px] text-slate-500 flex justify-between items-center pt-1 border-t border-slate-900">
                          <span>Notified driver email: <strong className="text-slate-400">{f.notification_email}</strong></span>
                          {f.email_sent && f.email_sent_at && (
                            <span className="text-emerald-500/80">Alert sent on {new Date(f.email_sent_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ==================== INSPECTION DIALOG MODAL ==================== */}
      {showInspectionModal && selectedBookingForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="text-xs font-black text-teal-400 uppercase tracking-widest">{inspectionType} SAFETY INSPECTION</h3>
                <p className="text-sm font-bold text-white leading-tight">{selectedBookingForInspection.client_name}</p>
              </div>
              <button
                onClick={() => setShowInspectionModal(false)}
                className="text-slate-400 hover:text-white font-extrabold text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800">
                <p className="text-slate-400">Vehicle: <strong className="text-white">{selectedBookingForInspection.assigned_vehicle_reg || 'Rented'}</strong></p>
                <p className="text-slate-400">Trip Ref: <strong className="text-white">{selectedBookingForInspection.tour_reference}</strong></p>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Enter Current Mileage (km)</span>
                <input
                  type="number"
                  value={inspectionMileage}
                  onChange={(e) => setInspectionMileage(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-white font-black"
                />
              </div>

              {/* Checks */}
              <div className="space-y-2 border border-slate-800 rounded bg-slate-950/40 p-2 max-h-60 overflow-y-auto scrollbar-thin">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">10-Point Core Safety Checks</p>
                
                {Object.keys(inspectionChecklist).map((checkKey) => {
                  const checkVal = inspectionChecklist[checkKey];
                  const cleanLabel = checkKey.replace(/_/g, ' ');

                  return (
                    <div key={checkKey} className="p-2 border-b border-slate-900 last:border-0 space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="capitalize font-bold text-slate-200">{cleanLabel}</span>
                        <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded gap-1">
                          <button
                            type="button"
                            onClick={() => handleInspectionChecklistChange(checkKey, 'pass')}
                            className={`px-2 py-0.5 rounded text-[8px] font-black ${
                              checkVal === 'pass' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            PASS
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInspectionChecklistChange(checkKey, 'flag')}
                            className={`px-2 py-0.5 rounded text-[8px] font-black ${
                              checkVal === 'flag' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            FLAG
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInspectionChecklistChange(checkKey, 'fail')}
                            className={`px-2 py-0.5 rounded text-[8px] font-black ${
                              checkVal === 'fail' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            FAIL
                          </button>
                        </div>
                      </div>

                      {/* Display input if check is failed or flagged */}
                      {checkVal !== 'pass' && (
                        <div className="space-y-1 bg-slate-950 p-2 rounded border border-slate-850 animate-scale-up">
                          <input
                            type="text" required
                            placeholder="Describe fault details (e.g. left bulb burnt out)"
                            value={inspectionFaults[checkKey] || ''}
                            onChange={(e) => handleInspectionFaultChange(checkKey, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[10px] text-white"
                          />
                          <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900 p-1.5 rounded text-center cursor-pointer flex items-center justify-center gap-1.5 min-h-[32px] transition-colors overflow-hidden">
                            {uploadingMediaKeys[checkKey] ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                                <span className="text-[9px] text-teal-400 font-bold">Uploading photo...</span>
                              </>
                            ) : inspectionMedia[checkKey] ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[9px] text-emerald-400 font-bold truncate">Photo Attached ✓</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => handleInspectionMediaUpload(checkKey, e)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </>
                            ) : (
                              <>
                                <Camera className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-[9px] text-slate-400">Capture fault photo (Camera)</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => handleInspectionMediaUpload(checkKey, e)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <span className="text-slate-400 block mb-1">General observations notes</span>
                <textarea
                  placeholder="Additional observations..."
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white h-12"
                />
              </div>

              {/* Embed Interactive touch signature pad */}
              <div className="bg-slate-950 p-3 rounded border border-slate-850">
                <SignaturePad
                  onSave={(data) => setInspectionSignature(data)}
                  savedSignature={inspectionSignature}
                />
              </div>

              <button
                type="button"
                onClick={submitInspection}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black py-2.5 rounded-lg text-xs transition-colors shadow-lg"
              >
                Submit Operational Compliance Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Footer Navigation Panel */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-850 grid grid-cols-5 text-center">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'tasks' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Compass className="w-5 h-5" />
          Tours
        </button>
        <button
          onClick={() => setActiveTab('recon')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'recon' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          Trip Recon
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'transfer' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          Transfers
        </button>
        <button
          onClick={() => setActiveTab('logging')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'logging' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ClipboardCheck className="w-5 h-5" />
          Safety Log
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`py-2 text-[10px] font-bold flex flex-col items-center justify-center gap-1 ${
            activeTab === 'documents' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          Vault
        </button>
      </footer>

    </div>
  );
}
