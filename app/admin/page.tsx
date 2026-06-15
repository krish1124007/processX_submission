"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getAdminStats,
  getTodayReports, 
  getAllPolicies, 
  createNewPolicy, 
  getAllHistory 
} from "../actions";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  History, 
  LogOut, 
  FileText,
  User,
  Clock,
  Plus
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'policies' | 'history'>('dashboard');
  
  const [stats, setStats] = useState<{totalPatients: number, totalFallCases: number, totalNurses: number} | null>(null);
  const [todayReports, setTodayReports] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [newPolicyTitle, setNewPolicyTitle] = useState("");
  const [newPolicyContent, setNewPolicyContent] = useState("");
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, reportsData, policiesData, historyData] = await Promise.all([
        getAdminStats(),
        getTodayReports(),
        getAllPolicies(),
        getAllHistory()
      ]);
      setStats(statsData);
      setTodayReports(reportsData);
      setPolicies(policiesData);
      setHistory(historyData);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    }
  };

  const handleLogout = () => {
    router.push("/login");
  };

  const handleSavePolicy = async () => {
    if (!newPolicyTitle.trim() || !newPolicyContent.trim()) {
      toast.error("Title and content are both required.");
      return;
    }

    setIsSavingPolicy(true);
    const saving = toast.loading("Saving policy…");
    try {
      await createNewPolicy(newPolicyTitle, newPolicyContent);
      setNewPolicyTitle("");
      setNewPolicyContent("");
      setShowPolicyForm(false);

      // Refresh policies
      const updatedPolicies = await getAllPolicies();
      setPolicies(updatedPolicies);

      toast.success("Policy created successfully.", { id: saving });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create policy.", { id: saving });
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
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
            <ShieldCheck size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg tracking-tight text-slate-900 leading-none">ProcessX</span>
            <span className="text-[10px] text-blue-500 font-medium uppercase tracking-widest mt-1">Admin Panel</span>
          </div>
        </div>

        <div className="flex-1 px-4 space-y-1 overflow-y-auto mt-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Menu</div>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="policies" icon={FileText} label="Policies" />
          <NavItem id="history" icon={History} label="Report History" />
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
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">System Overview</h2>
                  <p className="text-slate-500 text-sm mt-1">Real-time statistics and recent activity.</p>
                </div>
              </header>

              {/* Analytics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
                     <div className="flex justify-between items-start mb-4">
                       <div className="p-2 bg-sky-50 rounded-lg">
                         <FileText className="w-5 h-5 text-sky-600" />
                       </div>
                     </div>
                     <h3 className="text-3xl font-semibold text-slate-900 mb-1">{stats?.totalFallCases ?? '-'}</h3>
                     <p className="text-sm font-medium text-slate-500">Total Fall Cases</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
                     <div className="flex justify-between items-start mb-4">
                       <div className="p-2 bg-blue-50 rounded-lg">
                         <User className="w-5 h-5 text-blue-600" />
                       </div>
                     </div>
                     <h3 className="text-3xl font-semibold text-slate-900 mb-1">{stats?.totalPatients ?? '-'}</h3>
                     <p className="text-sm font-medium text-slate-500">Active Patients</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
                     <div className="flex justify-between items-start mb-4">
                       <div className="p-2 bg-emerald-50 rounded-lg">
                         <ShieldCheck className="w-5 h-5 text-emerald-600" />
                       </div>
                     </div>
                     <h3 className="text-3xl font-semibold text-slate-900 mb-1">{stats?.totalNurses ?? '-'}</h3>
                     <p className="text-sm font-medium text-slate-500">Registered Nurses</p>
                  </div>
              </div>

              {/* Today's Reports */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                    <Clock size={18} className="text-blue-500" />
                    Reports Generated Today
                  </h3>
                  <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full">{todayReports.length}</span>
                </div>
                
                {todayReports.length === 0 ? (
                  <div className="px-6 py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No reports generated today yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {todayReports.map((report) => (
                      <div key={report._id} className="p-6 flex flex-col sm:flex-row gap-6 hover:bg-slate-50 transition-colors">
                        <div className="sm:w-1/4 flex flex-col gap-1">
                          <span className="font-semibold text-slate-900 text-sm">{report.patientName}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(report.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <div className="mt-2 inline-flex items-center px-2 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                            Nurse: {report.nurseName}
                          </div>
                        </div>
                        <div className="sm:w-3/4">
                          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {report.progressNotes}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Policies Tab */}
          {activeTab === 'policies' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <header className="flex justify-between items-end pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Policy Management</h2>
                  <p className="text-slate-500 text-sm mt-1">Configure evaluation guidelines for AI analysis.</p>
                </div>
                <button 
                  onClick={() => setShowPolicyForm(!showPolicyForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  {showPolicyForm ? 'Cancel' : <><Plus size={16} /> New Policy</>}
                </button>
              </header>

              {/* Create Policy Form */}
              {showPolicyForm && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-5">Draft New Policy</h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Policy Title</label>
                      <input
                        type="text"
                        value={newPolicyTitle}
                        onChange={(e) => setNewPolicyTitle(e.target.value)}
                        className="w-full max-w-lg rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                        placeholder="e.g., Q3 Fall Prevention Guidelines"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Comprehensive Content</label>
                      <textarea
                        value={newPolicyContent}
                        onChange={(e) => setNewPolicyContent(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[200px] transition-shadow leading-relaxed"
                        placeholder="Enter the full policy details here..."
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSavePolicy}
                        disabled={isSavingPolicy}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {isSavingPolicy ? "Saving..." : "Save Policy"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Policy List */}
              <div className="space-y-4">
                {policies.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No policies found. Create your first policy above.</p>
                  </div>
                ) : (
                  policies.map((policy) => (
                    <div key={policy._id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                          <FileText size={16} className="text-blue-500" />
                          {policy.title}
                        </h3>
                        <span className="text-xs font-medium text-slate-500">
                          {new Date(policy.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                      <div className="p-6 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {policy.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <header className="flex justify-between items-end pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">System History</h2>
                  <p className="text-slate-500 text-sm mt-1">A complete chronological log of all assessments.</p>
                </div>
              </header>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {history.length === 0 ? (
                  <div className="px-8 py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No report history found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-medium uppercase tracking-wider">
                          <th className="px-6 py-4">Date & Time</th>
                          <th className="px-6 py-4">Patient</th>
                          <th className="px-6 py-4">Nurse</th>
                          <th className="px-6 py-4 w-full">Progress Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map((item) => (
                          <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-slate-600 text-sm">
                              {new Date(item.createdAt).toLocaleString(undefined, { 
                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </td>
                            <td className="px-6 py-4 text-slate-900 font-semibold text-sm">{item.patientName}</td>
                            <td className="px-6 py-4 text-slate-600 text-sm">
                               {item.nurseName}
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm">
                              <div className="max-w-md truncate">
                                {item.progressNotes}
                              </div>
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
    </div>
  );
}
