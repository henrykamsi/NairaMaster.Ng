import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  useAdminGetStats, useAdminGetUsers, useAdminGetSubmissions, 
  useAdminGetWithdrawals, useAdminGetAllDailyDues, useGetSettings,
  useAdminApproveSubmission, useAdminDeclineSubmission,
  useAdminApproveWithdrawal, useAdminDeclineWithdrawal,
  useUpdateSettings, useAdminSetScore, useAdminCreditUser
} from "@workspace/api-client-react";
import { 
  LayoutDashboard, Users, ListTodo, FileCheck, Landmark, 
  Wallet, Settings as SettingsIcon, LogOut, CheckCircle, XCircle 
} from "lucide-react";
import { formatNaira, formatDate, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!token || !user?.isAdmin) {
      setLocation("/login");
    }
  }, [token, user, setLocation]);

  if (!token || !user?.isAdmin) return null;

  const TABS = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "users", label: "Users", icon: Users },
    { id: "submissions", label: "Submissions", icon: FileCheck },
    { id: "withdrawals", label: "Withdrawals", icon: Landmark },
    { id: "dues", label: "Daily Dues", icon: Wallet },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-background border-r border-border shrink-0 md:h-screen sticky top-0 flex flex-col z-20 shadow-sm md:shadow-none">
        <div className="p-5 border-b border-border flex items-center justify-between md:justify-center bg-primary/5">
          <div className="font-display font-bold text-2xl text-primary tracking-tight">Admin Panel</div>
          <Button variant="ghost" size="icon" className="md:hidden text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => logout()}><LogOut className="w-5 h-5" /></Button>
        </div>
        <div className="p-3 space-y-1 overflow-x-auto md:overflow-y-auto flex md:flex-col items-center md:items-stretch no-scrollbar">
          {TABS.map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)}
              className={cn("flex items-center gap-3 px-4 py-3.5 rounded-lg text-[15px] font-semibold transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring", activeTab === t.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]" : "hover:bg-muted text-muted-foreground hover:text-foreground")}
            >
              <t.icon className={cn("w-5 h-5", activeTab === t.id ? "opacity-100" : "opacity-70")} /> <span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto p-4 border-t border-border hidden md:block">
          <Button variant="outline" className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive hover:text-white h-12 font-bold" onClick={() => { logout(); setLocation("/login"); }}>
            <LogOut className="w-5 h-5 mr-3" /> Exit Admin
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen max-w-7xl mx-auto w-full">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "submissions" && <SubmissionsTab />}
        {activeTab === "withdrawals" && <WithdrawalsTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab === "tasks" && <div className="flex items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border/60 bg-muted/10 rounded-2xl mt-4 font-semibold text-lg"><ListTodo className="w-8 h-8 mr-3 opacity-50" /> Manage Tasks (Admin Module Pending)</div>}
        {activeTab === "dues" && <div className="flex items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border/60 bg-muted/10 rounded-2xl mt-4 font-semibold text-lg"><Wallet className="w-8 h-8 mr-3 opacity-50" /> Daily Dues Ledger (Admin Module Pending)</div>}
      </main>
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useAdminGetStats();
  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Dashboard Overview</h2>
        <p className="text-muted-foreground font-medium mt-1">Real-time platform statistics</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Users" value={stats?.totalUsers || 0} />
        <StatCard title="Total Tasks" value={stats?.totalTasks || 0} />
        <StatCard title="Total Revenue" value={formatNaira(stats?.totalRevenue || 0)} />
        <StatCard title="Total Withdrawals" value={formatNaira(stats?.totalWithdrawals || 0)} />
        <StatCard title="Total Submissions" value={stats?.totalSubmissions || 0} />
        <StatCard title="Pending Submissions" value={stats?.pendingSubmissions || 0} highlight={!!stats?.pendingSubmissions} />
        <StatCard title="Pending Withdrawals" value={stats?.pendingWithdrawals || 0} highlight={!!stats?.pendingWithdrawals} />
      </div>
    </div>
  );
}

function StatCard({ title, value, highlight = false }: { title: string, value: string | number, highlight?: boolean }) {
  return (
    <Card className={cn("overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md", highlight && "border-warning bg-warning/5 ring-1 ring-warning/30")}>
      <CardContent className="p-5 sm:p-6 relative">
        <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">{title}</p>
        <p className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-foreground">{value}</p>
        {highlight && <div className="absolute top-0 right-0 w-2 h-full bg-warning/80"></div>}
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const { data, isLoading } = useAdminGetUsers({ query: { queryKey: ["adminUsers"] } });
  const [search, setSearch] = useState("");
  
  const users = data?.users || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-end border-b border-border/50 pb-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Manage Users</h2>
          <p className="text-muted-foreground font-medium mt-1">Control accounts, balances, and scoring.</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search user email or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-72 h-11 bg-background" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20"><CardContent className="p-5 text-center"><p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Users</p><p className="text-3xl font-display font-bold text-primary">{data?.totalUsers || 0}</p></CardContent></Card>
        <Card className="bg-success/5 border-success/20"><CardContent className="p-5 text-center"><p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Online</p><p className="text-3xl font-display font-bold text-success">{data?.onlineUsers || 0}</p></CardContent></Card>
        <Card className="bg-muted/30"><CardContent className="p-5 text-center"><p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Offline</p><p className="text-3xl font-display font-bold text-foreground">{data?.offlineUsers || 0}</p></CardContent></Card>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-foreground font-bold border-b border-border">
              <tr>
                <th className="px-5 py-4 uppercase text-xs tracking-wider">User</th>
                <th className="px-5 py-4 uppercase text-xs tracking-wider">Balance</th>
                <th className="px-5 py-4 uppercase text-xs tracking-wider text-center">Score</th>
                <th className="px-5 py-4 uppercase text-xs tracking-wider">Status</th>
                <th className="px-5 py-4 uppercase text-xs tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading users...</td></tr>
              ) : users.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())).map(user => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-base text-foreground">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-muted-foreground font-medium">{user.email}</p>
                  </td>
                  <td className="px-5 py-4 font-bold text-base text-foreground">{formatNaira(user.balance)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn("inline-flex justify-center items-center px-3 py-1 rounded-full font-bold text-xs", user.score < 15 ? "bg-destructive/15 text-destructive border border-destructive/20" : "bg-success/15 text-success border border-success/20")}>{user.score}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="capitalize text-[11px] font-extrabold px-2.5 py-1.5 bg-muted rounded-md border border-border tracking-wide">{user.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <UserActions user={user} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function UserActions({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"score"|"credit"|null>(null);
  const [amount, setAmount] = useState("");
  
  const qc = useQueryClient();
  const setScore = useAdminSetScore();
  const credit = useAdminCreditUser();

  const handleAction = () => {
    if(action === "score") {
      setScore.mutate({ userId: user.id, data: { score: Number(amount) } }, {
        onSuccess: () => { toast({ title: "Score updated" }); setOpen(false); qc.invalidateQueries({ queryKey: ["adminUsers"] }); }
      });
    } else if(action === "credit") {
      credit.mutate({ userId: user.id, data: { amount: Number(amount), description: "Admin credit" } }, {
        onSuccess: () => { toast({ title: "User credited" }); setOpen(false); qc.invalidateQueries({ queryKey: ["adminUsers"] }); }
      });
    }
  };

  return (
    <>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" className="h-8 font-bold border-border shadow-sm" onClick={() => { setAction("score"); setAmount(String(user.score)); setOpen(true); }}>Score</Button>
        <Button size="sm" variant="default" className="h-8 font-bold shadow-sm" onClick={() => { setAction("credit"); setAmount(""); setOpen(true); }}>Credit</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-xl">{action === "score" ? "Update Trust Score" : "Credit Wallet Balance"}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg border border-border flex items-center justify-between">
               <div>
                 <p className="text-sm font-bold text-foreground">{user.firstName} {user.lastName}</p>
                 <p className="text-xs text-muted-foreground">{user.email}</p>
               </div>
               {action === "credit" && <div className="text-right"><p className="text-xs font-semibold text-muted-foreground uppercase">Current</p><p className="font-bold text-primary">{formatNaira(user.balance)}</p></div>}
               {action === "score" && <div className="text-right"><p className="text-xs font-semibold text-muted-foreground uppercase">Current</p><p className="font-bold text-foreground">{user.score}/100</p></div>}
            </div>
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-foreground">{action === "score" ? "New Score (0-100)" : "Amount to Credit (₦)"}</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-12 text-lg font-bold" autoFocus />
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setOpen(false)} className="h-11">Cancel</Button>
             <Button onClick={handleAction} disabled={!amount} className="h-11 font-bold">Confirm Action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SubmissionsTab() {
  const { data, isLoading } = useAdminGetSubmissions({ query: { queryKey: ["adminSubmissions"] } });
  const qc = useQueryClient();
  const approve = useAdminApproveSubmission();
  const decline = useAdminDeclineSubmission();

  const subs = data?.pending || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-border/50 pb-6">
        <h2 className="text-3xl font-display font-bold text-foreground">Task Submissions</h2>
        <p className="text-muted-foreground font-medium mt-1">Review and approve user task screenshots.</p>
      </div>

      {subs.length === 0 && !isLoading && <div className="flex flex-col items-center justify-center p-16 text-muted-foreground border-2 border-dashed border-border/60 bg-muted/10 rounded-2xl"><FileCheck className="w-12 h-12 mb-4 opacity-30" /><p className="font-semibold text-lg">Inbox Zero!</p><p className="text-sm">No pending submissions to review.</p></div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {subs.map(s => (
          <Card key={s.id} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-muted/40 p-4 border-b border-border/50">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-bold font-display text-lg leading-tight line-clamp-2">{s.task?.title}</h4>
                  <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{s.user?.firstName} {s.user?.lastName}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary font-bold rounded-md text-sm">{formatNaira(s.task?.reward || 0)}</span>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1.5 uppercase">{formatDate(s.createdAt)}</p>
                </div>
              </div>
            </div>
            <CardContent className="p-5 space-y-5">
              {s.screenshots && s.screenshots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {s.screenshots.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-lg border border-border/50 bg-black/5 aspect-square">
                      <img src={url} alt="Proof" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white font-bold text-xs bg-black/60 px-2 py-1 rounded">View Full</span></div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="h-32 bg-muted/30 border border-dashed border-border rounded-lg flex items-center justify-center text-sm font-semibold text-muted-foreground">No screenshots attached</div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive hover:text-white h-11 font-bold"
                  onClick={() => decline.mutate({ submissionId: s.id, data: { reason: "Failed requirements" } }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["adminSubmissions"] }) })}
                >
                  <XCircle className="w-5 h-5 mr-2" /> Decline
                </Button>
                <Button className="flex-1 bg-success hover:bg-success/90 h-11 font-bold shadow-sm"
                  onClick={() => approve.mutate({ submissionId: s.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["adminSubmissions"] }) })}
                >
                  <CheckCircle className="w-5 h-5 mr-2" /> Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WithdrawalsTab() {
  const { data, isLoading } = useAdminGetWithdrawals({ query: { queryKey: ["adminWithdrawals"] } });
  const qc = useQueryClient();
  const approve = useAdminApproveWithdrawal();
  const decline = useAdminDeclineWithdrawal();

  const withdrawals = data || [];
  const pending = withdrawals.filter(w => w.status === 'under_review' || w.status === 'pending');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-border/50 pb-6">
        <h2 className="text-3xl font-display font-bold text-foreground">Pending Withdrawals</h2>
        <p className="text-muted-foreground font-medium mt-1">Process user payout requests.</p>
      </div>

      {pending.length === 0 && !isLoading && <div className="flex flex-col items-center justify-center p-16 text-muted-foreground border-2 border-dashed border-border/60 bg-muted/10 rounded-2xl"><Landmark className="w-12 h-12 mb-4 opacity-30" /><p className="font-semibold text-lg">All caught up!</p><p className="text-sm">No pending withdrawal requests.</p></div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pending.map(w => (
          <Card key={w.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-5">
              <div className="flex justify-between items-start border-b border-border/50 pb-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Request Amount</p>
                  <h4 className="font-bold font-display text-3xl text-foreground">{formatNaira(w.amount)}</h4>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-warning/15 text-warning font-bold rounded-md text-xs uppercase tracking-wide">Pending</span>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-2 uppercase">{formatDate(w.createdAt)}</p>
                </div>
              </div>
              
              <div className="bg-muted/40 p-4 rounded-xl space-y-3 border border-border/30">
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground font-semibold">User:</span> <span className="font-bold bg-background px-2 py-1 rounded shadow-sm text-sm">{w.user?.firstName} {w.user?.lastName}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground font-semibold">Bank Name:</span> <span className="font-bold text-sm uppercase">{w.bankName}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground font-semibold">Account No:</span> <span className="font-display font-bold text-primary text-base tracking-widest bg-primary/5 px-2 py-1 rounded border border-primary/10">{w.accountNumber}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground font-semibold">Account Name:</span> <span className="font-bold text-sm uppercase">{w.accountName}</span></div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive hover:text-white h-12 font-bold"
                  onClick={() => decline.mutate({ withdrawalId: w.id, data: { note: "Details mismatch" } }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["adminWithdrawals"] }) })}
                >
                  <XCircle className="w-5 h-5 mr-2" /> Decline
                </Button>
                <Button className="flex-1 bg-success hover:bg-success/90 h-12 font-bold shadow-sm"
                  onClick={() => approve.mutate({ withdrawalId: w.id, data: {} }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["adminWithdrawals"] }) })}
                >
                  <CheckCircle className="w-5 h-5 mr-2" /> Mark as Paid
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: ["settings"] } });
  const updateSettings = useUpdateSettings();
  const qc = useQueryClient();
  
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse font-semibold">Loading system configuration...</div>;

  const save = () => {
    updateSettings.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Configuration Updated", description: "Global settings have been saved successfully." });
        qc.invalidateQueries({ queryKey: ["settings"] });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-border/50 pb-6">
        <h2 className="text-3xl font-display font-bold text-foreground">Platform Configuration</h2>
        <p className="text-muted-foreground font-medium mt-1">Manage core platform fees and thresholds.</p>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="bg-primary/5 p-4 border-b border-primary/10">
          <h3 className="font-bold text-primary flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Financial Variables</h3>
        </div>
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-foreground">Daily Due Amount (₦)</label>
              <Input type="number" value={formData.dailyDueAmount || ''} onChange={e => setFormData({...formData, dailyDueAmount: Number(e.target.value)})} className="h-12 text-lg font-semibold bg-muted/30" />
            </div>
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-foreground">Task Creation Fee (₦)</label>
              <Input type="number" value={formData.taskCreationFee || ''} onChange={e => setFormData({...formData, taskCreationFee: Number(e.target.value)})} className="h-12 text-lg font-semibold bg-muted/30" />
            </div>
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-foreground">Monday Promo Fee (₦)</label>
              <Input type="number" value={formData.promoFee || ''} onChange={e => setFormData({...formData, promoFee: Number(e.target.value)})} className="h-12 text-lg font-semibold bg-muted/30" />
            </div>
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-foreground">Min Withdrawal (₦)</label>
              <Input type="number" value={formData.minWithdrawal || ''} onChange={e => setFormData({...formData, minWithdrawal: Number(e.target.value)})} className="h-12 text-lg font-semibold bg-muted/30" />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-6 border-t border-border/50">
            <div>
              <p className="font-bold text-foreground text-lg">Enable Daily Dues</p>
              <p className="text-sm text-muted-foreground font-medium">Charge users daily for performing tasks</p>
            </div>
            <Switch checked={formData.dailyDuesEnabled} onCheckedChange={c => setFormData({...formData, dailyDuesEnabled: c})} />
          </div>
        </CardContent>
        <div className="p-4 bg-muted/30 border-t border-border/50 text-right">
          <Button onClick={save} disabled={updateSettings.isPending} className="h-12 px-8 font-bold text-base shadow-sm">
            {updateSettings.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
