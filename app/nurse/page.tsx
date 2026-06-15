"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getPatients,
  createPatient,
  createFallCase,
  updateFallCase,
  getPatientHistory,
  getNurseDashboardStats,
  getAllHistory
} from "../actions";
import {
  LayoutDashboard,
  Users,
  History,
  LogOut,
  Plus,
  User as UserIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Pencil,
  FolderClosed,
  Lock,
  X
} from "lucide-react";

type FlagItem = {
  id: string;
  label: string;
  status: 'MISSING' | 'VAGUE';
  evidence: string;
  fixMessage: string;
};

export default function NurseDashboard() {
  const router = useRouter();
  
  // Tabs: dashboard, patients, history
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'history'>('dashboard');

  // Dashboard State
  const [dashboardStats, setDashboardStats] = useState<{
    todayReportsCount: number;
    pendingFollowUps: {patientId: string, patientName: string, dueDay: number, lastReportDate: string}[];
  } | null>(null);

  // Patients State
  const [patients, setPatients] = useState<{_id: string, name: string, contactNumber: string}[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientContact, setNewPatientContact] = useState("");
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  // Selected Patient Details State
  const [patientHistory, setPatientHistory] = useState<{_id: string, cycle: number, dayNumber: number, progressNotes: string, flags: FlagItem[], compliant: boolean, createdAt: string}[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // New Note State
  const [note, setNote] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{ dayNumber: number; compliant: boolean; flags: FlagItem[] } | null>(null);
  // Naya fall case (cycle) shuru karne ka mode
  const [newCaseMode, setNewCaseMode] = useState(false);

  // Patient ke andar kaunsa fall case khula hai (null = cases ki history list)
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState<number>(1);

  // Edit log state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editFlags, setEditFlags] = useState<FlagItem[]>([]);

  // My Activity — selected row to open in detail modal
  const [openActivity, setOpenActivity] = useState<any | null>(null);

  // Nurse History State
  const [myHistory, setMyHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchPatients();
    fetchDashboardStats();
    fetchMyHistory();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const stats = await getNurseDashboardStats();
      setDashboardStats(stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const fetchMyHistory = async () => {
    try {
      const history = await getAllHistory(); // For demo purposes, fetches all history
      setMyHistory(history);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPatientHistory = async (patientId: string) => {
    setIsLoadingHistory(true);
    setResults(null);
    setNote("");
    setEditingId(null);
    setEditFlags([]);
    try {
      const history = await getPatientHistory(patientId);
      setPatientHistory(history);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const startEdit = (logId: string, currentText: string) => {
    setEditingId(logId);
    setEditNote(currentText);
    setEditFlags([]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNote("");
    setEditFlags([]);
  };

  const handleSaveEdit = async (logId: string) => {
    if (!editNote.trim()) return;
    setIsEditing(true);
    setEditFlags([]);
    const saving = toast.loading("Re-checking edited note…");
    try {
      const res = await updateFallCase(logId, editNote);
      if (res.compliant) {
        toast.success(`Day ${res.dayNumber} note updated — still compliant.`, { id: saving });
        cancelEdit();
        await fetchPatientHistory(selectedPatientId);
        fetchMyHistory();
      } else {
        setEditFlags(res.flags as FlagItem[]);
        toast.error(
          `Edit not saved — ${res.flags.length} issue${res.flags.length === 1 ? "" : "s"} must be fixed first.`,
          { id: saving },
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Edit check failed. Check that GROQ_API_KEY is set.", { id: saving });
    } finally {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      setSelectedCycle(null);
      setNewCaseMode(false);
      setActiveDay(1);
      fetchPatientHistory(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleLogout = () => {
    router.push("/login");
  };

  const handleCreatePatient = async () => {
    if (!newPatientName.trim()) {
      toast.error("Patient name is required.");
      return;
    }
    try {
      const newPatient = await createPatient(newPatientName, newPatientContact);
      setPatients([newPatient, ...patients]);
      setSelectedPatientId(newPatient._id);
      setIsCreatingNewPatient(false);
      setNewPatientName("");
      setNewPatientContact("");
      toast.success(`Patient "${newPatient.name}" added.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create patient.");
    }
  };

  const handleAnalyze = async () => {
    if (!note.trim() || !selectedPatientId) return;

    setIsAnalyzing(true);
    setResults(null);

    const analyzing = toast.loading("Running AI policy check…");

    try {
      // createFallCase ab AI checker chalata hai. Note tabhi save hota hai jab compliant ho.
      const res = await createFallCase(selectedPatientId, note, newCaseMode);

      setResults({
        dayNumber: res.dayNumber,
        compliant: res.compliant,
        flags: res.flags as FlagItem[],
      });

      if (res.compliant) {
        // Note save ho gaya — case view mein raho, agle din pe jump karo.
        setNewCaseMode(false);
        setSelectedCycle(res.cycle);
        setActiveDay(res.dayNumber < 3 ? res.dayNumber + 1 : 3);
        await fetchPatientHistory(selectedPatientId);
        fetchDashboardStats();
        fetchMyHistory();
        toast.success(`Day ${res.dayNumber} note accepted & saved — fully compliant.`, {
          id: analyzing,
        });
      } else {
        // Note SAVE NAHI hua. Note field intact rakho taaki nurse fix kar sake.
        toast.error(
          `Note not saved — ${res.flags.length} issue${res.flags.length === 1 ? "" : "s"} must be fixed first.`,
          { id: analyzing },
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("AI policy check failed. Check that GROQ_API_KEY is set.", {
        id: analyzing,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activePatient = patients.find(p => p._id === selectedPatientId);

  // History ko fall-case cycles mein group karo (har cycle = ek Day 1->3 window).
  const cyclesMap: Record<number, typeof patientHistory> = {};
  patientHistory.forEach((h) => {
    (cyclesMap[h.cycle] ||= []).push(h);
  });
  const cycleNumbers = Object.keys(cyclesMap).map(Number).sort((a, b) => a - b);
  const maxCycle = cycleNumbers.length ? Math.max(...cycleNumbers) : 0;

  // Jo fall case khula hai uske logs (selectedCycle). New case ke liye empty array.
  const openLogs = selectedCycle !== null ? (cyclesMap[selectedCycle] || []) : [];
  const filledDays = openLogs.length;                 // kitne din save ho chuke
  const nextDayToFill = filledDays + 1;               // agla din (1..3)
  const caseComplete = filledDays >= 3;
  const dayLogFor = (d: number) => openLogs.find((l) => l.dayNumber === d);

  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        if (id !== 'patients') setSelectedPatientId("");
      }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm ${
        activeTab === id
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={18} className={activeTab === id ? 'text-blue-600' : 'text-slate-400'} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-sky-50/40 text-slate-900 font-sans flex overflow-hidden">
      
      {/* Sidebar - Light theme */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-20">
        <div className="px-6 py-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-white shadow-sm shadow-blue-200">
            <Stethoscope size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg tracking-tight text-slate-900 leading-none">ProcessX</span>
            <span className="text-[10px] text-blue-500 font-medium uppercase tracking-widest mt-1">Nurse Portal</span>
          </div>
        </div>

        <div className="flex-1 px-4 space-y-1 overflow-y-auto mt-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Menu</div>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="patients" icon={Users} label="Patients Directory" />
          <NavItem id="history" icon={History} label="My Activity" />
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-500 font-medium hover:bg-rose-50 hover:text-rose-600 transition-colors text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 h-screen overflow-y-auto">
        <div className="p-8 max-w-[1200px] mx-auto min-h-full">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <header className="flex justify-between items-end pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back!</h2>
                  <p className="text-slate-500 text-sm mt-1">Here is your daily overview and pending tasks.</p>
                </div>
              </header>

              {/* Stat strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-semibold text-slate-900 leading-none">{dashboardStats?.todayReportsCount ?? '–'}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1.5">Reports Today</p>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-xl shrink-0">
                      <AlertCircle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-semibold text-slate-900 leading-none">{dashboardStats?.pendingFollowUps.length ?? '–'}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1.5">Pending Follow-ups</p>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-xl shrink-0">
                      <Users className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-semibold text-slate-900 leading-none">{patients.length}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1.5">Total Patients</p>
                    </div>
                  </div>
              </div>

              {/* Pending Follow-ups */}
              <div>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[420px]">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                         <AlertCircle size={18} className="text-amber-500" />
                         Pending Follow-ups
                      </h3>
                      <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{dashboardStats?.pendingFollowUps.length ?? 0}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                       {dashboardStats?.pendingFollowUps && dashboardStats.pendingFollowUps.length > 0 ? (
                         <div className="divide-y divide-slate-100">
                           {dashboardStats.pendingFollowUps.map(task => (
                             <button 
                               key={task.patientId}
                               onClick={() => {
                                 setActiveTab('patients');
                                 setSelectedPatientId(task.patientId);
                               }}
                               className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                             >
                               <div>
                                 <p className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{task.patientName}</p>
                                 <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                    <Clock size={12} />
                                    Last report: {new Date(task.lastReportDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                 </p>
                               </div>
                               <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded text-[11px] font-semibold border border-amber-200">
                                 Due: Day {task.dueDay}
                               </div>
                             </button>
                           ))}
                         </div>
                       ) : (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                           <CheckCircle2 size={32} className="text-emerald-500 mb-3" />
                           <p className="text-sm font-medium text-slate-900">All caught up!</p>
                           <p className="text-xs text-slate-500 mt-1">No pending follow-ups required today.</p>
                         </div>
                       )}
                    </div>
                  </div>
              </div>
            </div>
          )}

          {/* Patients Tab */}
          {activeTab === 'patients' && (
            <div className="animate-in fade-in duration-500 h-full flex flex-col">
              {!activePatient ? (
                // Patients List View
                <div className="space-y-6">
                  <header className="flex justify-between items-end pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Patients Directory</h2>
                      <p className="text-slate-500 text-sm mt-1">Select a patient to view history or log a new note.</p>
                    </div>
                    <button 
                      onClick={() => setIsCreatingNewPatient(!isCreatingNewPatient)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                      {isCreatingNewPatient ? 'Cancel' : <><Plus size={16} /> New Patient</>}
                    </button>
                  </header>

                  {isCreatingNewPatient && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-end relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Patient Name</label>
                        <input
                          type="text"
                          value={newPatientName}
                          onChange={(e) => setNewPatientName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Number</label>
                        <input
                          type="text"
                          value={newPatientContact}
                          onChange={(e) => setNewPatientContact(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                        />
                      </div>
                      <button 
                        onClick={handleCreatePatient}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors h-[38px] shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {isLoadingPatients ? (
                      <div className="px-6 py-12 text-center text-slate-500 text-sm">Loading patients...</div>
                    ) : patients.length === 0 ? (
                      <div className="px-6 py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                        <UserIcon className="h-8 w-8 text-slate-300 mb-3" />
                        <p className="text-sm font-medium">No patients found. Create one to get started.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {patients.map(p => (
                          <button
                            key={p._id}
                            onClick={() => setSelectedPatientId(p._id)}
                            className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-sm">
                                {p.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{p.name}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{p.contactNumber}</p>
                              </div>
                            </div>
                            <div className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              View Details &rarr;
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedCycle === null ? (
                // ===== View A: Patient ki fall-case history list =====
                <div className="space-y-6">
                  <button
                    onClick={() => setSelectedPatientId("")}
                    className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors"
                  >
                    &larr; Back to Directory
                  </button>

                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex justify-between items-center relative gap-4">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
                    <div>
                      <h1 className="text-2xl font-semibold text-slate-900">{activePatient.name}</h1>
                      <p className="text-slate-500 mt-1 text-sm flex items-center gap-2">
                        <UserIcon size={14} /> Contact: {activePatient.contactNumber}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedCycle(maxCycle + 1); setNewCaseMode(true); setActiveDay(1); setNote(""); setResults(null); setEditingId(null); }}
                      className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 shrink-0"
                    >
                      <Plus size={16} /> New Fall Report
                    </button>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <History size={18} className="text-blue-500" />
                      Fall Case History
                    </h2>

                    {isLoadingHistory ? (
                      <p className="text-sm text-slate-500">Loading history...</p>
                    ) : cycleNumbers.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
                        <FolderClosed className="h-8 w-8 text-slate-300 mb-3 mx-auto" />
                        <p className="text-slate-500 text-sm font-medium">No fall reports yet. Click “New Fall Report” to log the first incident.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[...cycleNumbers].reverse().map((cy) => {
                          const logs = cyclesMap[cy];
                          const complete = logs.length >= 3;
                          const firstDate = logs[0]?.createdAt;
                          return (
                            <button
                              key={cy}
                              onClick={() => { setSelectedCycle(cy); setNewCaseMode(false); setActiveDay(logs.length < 3 ? logs.length + 1 : 1); setResults(null); setEditingId(null); }}
                              className="w-full text-left bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:border-blue-300 hover:shadow transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  <FolderClosed size={20} />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">Fall Case #{cy}</h3>
                                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                                    <Clock size={12} />
                                    {firstDate ? new Date(firstDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="hidden sm:flex items-center gap-1.5">
                                  {[1, 2, 3].map((d) => {
                                    const has = logs.some((l) => l.dayNumber === d);
                                    return (
                                      <span key={d} className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${has ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{d}</span>
                                    );
                                  })}
                                </div>
                                {complete ? (
                                  <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Completed</span>
                                ) : (
                                  <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">In progress</span>
                                )}
                                <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Open &rarr;</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // ===== View B: Ek fall case — horizontal Day 1/2/3 stepper =====
                <div className="space-y-6">
                  <button
                    onClick={() => { setSelectedCycle(null); setNewCaseMode(false); setResults(null); setEditingId(null); }}
                    className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors"
                  >
                    &larr; Back to {activePatient.name}'s cases
                  </button>

                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex justify-between items-center relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
                    <div>
                      <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                        <FolderClosed size={18} className="text-blue-500" />
                        {newCaseMode ? `New Fall Case #${selectedCycle}` : `Fall Case #${selectedCycle}`}
                      </h1>
                      <p className="text-slate-500 mt-1 text-sm flex items-center gap-2">
                        <UserIcon size={14} /> {activePatient.name}
                      </p>
                    </div>
                    {caseComplete ? (
                      <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1"><CheckCircle2 size={12} /> Completed</span>
                    ) : (
                      <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">{filledDays}/3 days</span>
                    )}
                  </div>

                  {/* Horizontal Day stepper */}
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((d) => {
                      const log = dayLogFor(d);
                      const isCurrent = d === nextDayToFill && !caseComplete;
                      const locked = !log && !isCurrent;
                      const isActive = activeDay === d;
                      return (
                        <button
                          key={d}
                          onClick={() => { if (!locked) { setActiveDay(d); setResults(null); setEditingId(null); } }}
                          disabled={locked}
                          className={`relative rounded-xl border p-4 text-left transition-all ${
                            isActive
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                              : locked
                              ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                              : 'border-slate-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-slate-900'}`}>Day {d}</span>
                            {log ? (
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            ) : isCurrent ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                            ) : (
                              <Lock size={13} className="text-slate-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {log ? 'Documented' : isCurrent ? 'To be logged' : 'Locked'}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active day content */}
                  {(() => {
                    const log = dayLogFor(activeDay);
                    if (log) {
                      // ---- Saved day: view + edit ----
                      return (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2.5">
                              <h3 className="font-semibold text-slate-900 text-base">Day {log.dayNumber} Report</h3>
                              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={11} /> Compliant</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 flex items-center gap-1.5">
                                <Clock size={12} />
                                {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {editingId !== log._id && (
                                <button onClick={() => startEdit(log._id, log.progressNotes)} className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50" title="Edit this note">
                                  <Pencil size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          {editingId === log._id ? (
                            <div>
                              <textarea className="w-full rounded-lg border border-blue-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[200px] leading-relaxed" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                              {editFlags.length > 0 && (
                                <div className="mt-3 space-y-2 bg-rose-50 border border-rose-100 rounded-lg p-3">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Edit blocked — fix these:</p>
                                  {editFlags.map((f) => (
                                    <div key={f.id} className="flex items-start gap-2 text-sm">
                                      <span className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${f.status === 'MISSING' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{f.status}</span>
                                      <span className="text-slate-700"><span className="font-medium text-slate-900">{f.label}:</span> {f.fixMessage}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2 mt-3">
                                <button onClick={() => handleSaveEdit(log._id)} disabled={isEditing || !editNote.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isEditing ? "Re-checking…" : "Save & Re-check"}</button>
                                <button onClick={cancelEdit} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1.5"><X size={14} /> Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{log.progressNotes}</p>
                          )}
                        </div>
                      );
                    }
                    if (activeDay === nextDayToFill && !caseComplete) {
                      // ---- Current day: add-note form + AI feedback ----
                      return (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-base">
                              <Plus size={18} className="text-blue-600" />
                              Log Day {activeDay} Progress Note
                            </h2>
                          </div>
                          <div className="p-6 flex flex-col xl:flex-row gap-6">
                            <div className="flex-1 flex flex-col">
                              <textarea
                                className="w-full flex-1 rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow resize-y min-h-[250px] outline-none leading-relaxed"
                                placeholder="Type or paste the comprehensive progress note here..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                              />
                              <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !note.trim()}
                                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                              >
                                {isAnalyzing ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving & Analyzing...
                                  </>
                                ) : (
                                  `Log Day ${activeDay} & Run AI Policy Check`
                                )}
                              </button>
                            </div>

                            {/* AI Feedback Panel */}
                            <div className="w-full xl:w-[350px] bg-slate-50 rounded-lg p-5 border border-slate-200 flex flex-col">
                                <h3 className="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                                   <AlertCircle size={14} className="text-blue-500" />
                                   Live AI Feedback
                                </h3>
                                {results ? (
                                  results.compliant ? (
                                    <div className="flex-1 flex flex-col animate-in fade-in duration-300">
                                      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 flex items-start gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                        <div>
                                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Day {results.dayNumber} — Accepted & Saved</h4>
                                          <p className="text-sm mt-1">This note meets all Day {results.dayNumber} documentation requirements. It has been saved to the patient record.</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 animate-in fade-in duration-300 flex-1 overflow-y-auto">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Day {results.dayNumber} Check</span>
                                        <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">{results.flags.length} flag{results.flags.length === 1 ? '' : 's'}</span>
                                      </div>
                                      {results.flags.map((f) => (
                                        <div key={f.id} className={`p-4 rounded-lg border ${f.status === 'MISSING' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                                          <div className="flex items-center justify-between mb-1.5">
                                            <h4 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${f.status === 'MISSING' ? 'text-red-700' : 'text-amber-700'}`}>
                                              <AlertCircle size={12} /> {f.status}
                                            </h4>
                                          </div>
                                          <p className={`text-sm font-medium ${f.status === 'MISSING' ? 'text-red-900' : 'text-amber-900'}`}>{f.label}</p>
                                          <p className="text-sm text-slate-700 mt-1">{f.fixMessage}</p>
                                          {f.evidence && (
                                            <p className="text-xs text-slate-500 mt-2 italic border-l-2 border-slate-300 pl-2">“{f.evidence}”</p>
                                          )}
                                        </div>
                                      ))}
                                      <p className="text-[11px] text-rose-600 text-center font-semibold bg-rose-50 py-2.5 px-3 rounded-md border border-rose-200">⚠ This note was NOT saved. Fix every flagged item and re-submit — only a complete note is accepted.</p>
                                    </div>
                                  )
                                ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                                    <ShieldCheckIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm text-center px-4">Submit your note to receive instant policy compliance feedback.</p>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    // ---- Locked day ----
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center">
                        <Lock className="h-7 w-7 text-slate-300 mb-3 mx-auto" />
                        <p className="text-slate-500 text-sm font-medium">Complete Day {nextDayToFill} first to unlock Day {activeDay}.</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <header className="flex justify-between items-end pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">My Activity</h2>
                  <p className="text-slate-500 text-sm mt-1">A log of all reports you have submitted.</p>
                </div>
              </header>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {myHistory.length === 0 ? (
                  <div className="px-6 py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                    <History className="h-8 w-8 text-slate-300 mb-3" />
                    <p className="text-sm font-medium">You haven't submitted any reports yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-medium uppercase tracking-wider">
                          <th className="px-6 py-4">Date & Time</th>
                          <th className="px-6 py-4">Patient</th>
                          <th className="px-6 py-4">Day</th>
                          <th className="px-6 py-4 w-full">Progress Notes Snippet</th>
                          <th className="px-6 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myHistory.map((item) => (
                          <tr
                            key={item._id}
                            onClick={() => setOpenActivity(item)}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4 text-slate-600 text-sm">
                              {new Date(item.createdAt).toLocaleString(undefined, {
                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td className="px-6 py-4 text-slate-900 font-semibold text-sm">{item.patientName}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Case #{item.cycle} · Day {item.dayNumber}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm">
                              <div className="max-w-md truncate">
                                {item.progressNotes}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Open &rarr;</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* My Activity — detail modal */}
      {openActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setOpenActivity(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{openActivity.patientName}</h3>
                <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Fall Case #{openActivity.cycle} · Day {openActivity.dayNumber}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(openActivity.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
              <button onClick={() => setOpenActivity(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                {openActivity.compliant ? (
                  <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 size={12} /> Compliant</span>
                ) : (
                  <span className="text-[11px] font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full flex items-center gap-1"><AlertCircle size={12} /> {openActivity.flags?.length || 0} flag{(openActivity.flags?.length || 0) === 1 ? '' : 's'}</span>
                )}
                <span className="text-xs text-slate-500">by {openActivity.nurseName}</span>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Progress Note</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-4">{openActivity.progressNotes}</p>
              </div>

              {openActivity.flags && openActivity.flags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Flags</h4>
                  <div className="space-y-2">
                    {openActivity.flags.map((f: any) => (
                      <div key={f.id} className={`p-3 rounded-lg border ${f.status === 'MISSING' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${f.status === 'MISSING' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{f.status}</span>
                          <span className="text-sm font-medium text-slate-900">{f.label}</span>
                        </div>
                        <p className="text-sm text-slate-700">{f.fixMessage}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick inline component for the shield icon
function ShieldCheckIcon(props: any) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
