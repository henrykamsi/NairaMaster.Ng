import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  useAdminGetStats, useAdminGetUsers, useAdminGetSubmissions,
  useAdminGetWithdrawals, useAdminGetAllDailyDues, useGetSettings,
  useAdminApproveSubmission, useAdminDeclineSubmission,
  useAdminApproveWithdrawal, useAdminDeclineWithdrawal,
  useUpdateSettings, useAdminSetScore, useAdminCreditUser,
  useAdminBlockUser, useAdminSuspendUser, useAdminShadowBanUser,
  useAdminLiftRestriction,
  useGetTasks, useCreateTask, useDeleteTask, useRenewTask, useExtendTask,
  getAdminGetUsersQueryKey, getAdminGetSubmissionsQueryKey,
  getAdminGetWithdrawalsQueryKey, getAdminGetAllDailyDuesQueryKey,
  getAdminGetStatsQueryKey, getGetTasksQueryKey,
} from "@workspace/api-client-react";
import {
  LayoutDashboard, Users, ListTodo, FileCheck, Landmark,
  Wallet, Settings as SettingsIcon, LogOut, CheckCircle, XCircle,
  RefreshCw, Plus, Trash2, UserCheck, UserX, ShieldOff, Ban,
  Unlock, TrendingUp, DollarSign, AlertCircle, Search, ChevronRight,
  Eye, Clock,
} from "lucide-react";
import { formatNaira, formatDate, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/* ─── Shell ─── */
export function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!token || !user?.isAdmin) setLocation("/login");
  }, [token, user, setLocation]);

  if (!token || !user?.isAdmin) return null;

  const TABS = [
    { id: "overview",     label: "Overview",     icon: LayoutDashboard },
    { id: "users",        label: "Users",         icon: Users },
    { id: "submissions",  label: "Submissions",   icon: FileCheck },
    { id: "withdrawals",  label: "Withdrawals",   icon: Landmark },
    { id: "tasks",        label: "Tasks",         icon: ListTodo },
    { id: "dues",         label: "Daily Dues",    icon: Wallet },
    { id: "settings",     label: "Settings",      icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-60 bg-background border-r border-border shrink-0 md:h-screen sticky top-0 flex flex-col z-20 shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
          <div className="font-display font-bold text-xl text-primary">Admin Panel</div>
          <Button variant="ghost" size="icon" className="md:hidden text-destructive" onClick={logout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-2 overflow-x-auto md:overflow-y-auto flex md:flex-col gap-1 no-scrollbar flex-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === t.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border hidden md:block">
          <Button
            variant="outline"
            className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive hover:text-white h-11 font-bold"
            onClick={() => { logout(); setLocation("/login"); }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Exit Admin
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-screen">
        <div className="max-w-6xl mx-auto">
          {activeTab === "overview"    && <OverviewTab />}
          {activeTab === "users"       && <UsersTab />}
          {activeTab === "submissions" && <SubmissionsTab />}
          {activeTab === "withdrawals" && <WithdrawalsTab />}
          {activeTab === "tasks"       && <TasksTab />}
          {activeTab === "dues"        && <DailyDuesTab />}
          {activeTab === "settings"    && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ title, value, sub, highlight = false, icon: Icon }: {
  title: string; value: string | number; sub?: string; highlight?: boolean; icon?: any;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md", highlight && "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20")}>
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
          {Icon && <Icon className={cn("w-4 h-4", highlight ? "text-amber-500" : "text-muted-foreground/40")} />}
        </div>
        <p className="text-3xl font-extrabold font-display tracking-tight text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>}
        {highlight && <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-400" />}
      </CardContent>
    </Card>
  );
}

/* ─── OVERVIEW ─── */
function OverviewTab() {
  const { data: stats, isLoading, error, refetch } = useAdminGetStats();

  if (error) return (
    <ErrorState message="Failed to load stats. Make sure you are logged in as admin." onRetry={refetch} />
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <TabHeader title="Dashboard Overview" sub="Real-time platform statistics" onRefresh={refetch} loading={isLoading} />
      {isLoading ? <LoadingGrid count={7} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Users"          value={stats?.totalUsers ?? 0}                             icon={Users} />
          <StatCard title="Total Tasks"          value={stats?.totalTasks ?? 0}                             icon={ListTodo} />
          <StatCard title="Total Revenue"        value={formatNaira(stats?.totalRevenue ?? 0)}              icon={DollarSign} />
          <StatCard title="Total Withdrawals"    value={stats?.totalWithdrawals ?? 0}                       icon={Landmark} />
          <StatCard title="Total Submissions"    value={stats?.totalSubmissions ?? 0}                       icon={FileCheck} />
          <StatCard title="Pending Submissions"  value={stats?.pendingSubmissions ?? 0}  highlight={!!stats?.pendingSubmissions}  icon={AlertCircle} />
          <StatCard title="Pending Withdrawals"  value={stats?.pendingWithdrawals ?? 0}  highlight={!!stats?.pendingWithdrawals}  icon={Clock} />
        </div>
      )}
    </div>
  );
}

/* ─── USERS ─── */
function UsersTab() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useAdminGetUsers();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<"score"|"credit"|"block"|"suspend"|null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const setScore   = useAdminSetScore();
  const credit     = useAdminCreditUser();
  const block      = useAdminBlockUser();
  const suspend    = useAdminSuspendUser();
  const shadowBan  = useAdminShadowBanUser();
  const lift       = useAdminLiftRestriction();

  const invalidate = () => qc.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });

  const users = (data?.users ?? []).filter((u: any) => {
    const q = search.toLowerCase();
    return !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
  });

  const handleAction = () => {
    if (!selectedUser) return;
    const uid = selectedUser.id;

    if (actionDialog === "score") {
      setScore.mutate({ userId: uid, data: { score: Number(amount) } }, {
        onSuccess: () => { toast({ title: "Score updated" }); closeAction(); invalidate(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    } else if (actionDialog === "credit") {
      credit.mutate({ userId: uid, data: { amount: Number(amount), description: "Admin credit" } }, {
        onSuccess: () => { toast({ title: "User credited ✓" }); closeAction(); invalidate(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    } else if (actionDialog === "block") {
      block.mutate({ userId: uid, data: { weeks: Number(amount), reason } }, {
        onSuccess: () => { toast({ title: "User blocked" }); closeAction(); invalidate(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    } else if (actionDialog === "suspend") {
      suspend.mutate({ userId: uid, data: { days: Number(amount), reason } }, {
        onSuccess: () => { toast({ title: "User suspended" }); closeAction(); invalidate(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    }
  };

  const closeAction = () => { setActionDialog(null); setSelectedUser(null); setAmount(""); setReason(""); };

  const openAction = (user: any, action: typeof actionDialog) => {
    setSelectedUser(user);
    setAmount(action === "score" ? String(user.score) : "");
    setReason("");
    setActionDialog(action);
  };

  const handleShadowBan = (uid: number) => {
    shadowBan.mutate({ userId: uid }, {
      onSuccess: () => { toast({ title: "User shadow-banned" }); invalidate(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const handleLift = (uid: number) => {
    lift.mutate({ userId: uid }, {
      onSuccess: () => { toast({ title: "Restrictions lifted" }); invalidate(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  if (error) return <ErrorState message="Failed to load users." onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <TabHeader title="Manage Users" sub={`${data?.totalUsers ?? 0} registered members`} onRefresh={refetch} loading={isLoading}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 w-full sm:w-64"
          />
        </div>
      </TabHeader>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Total"   value={data?.totalUsers ?? 0}   icon={Users} />
        <StatCard title="Online"  value={data?.onlineUsers ?? 0}  icon={UserCheck} />
        <StatCard title="Offline" value={data?.offlineUsers ?? 0} icon={UserX} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-8 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground font-medium">No users found.</td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">ID #{u.id} · {u.gender}</p>
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums">{formatNaira(u.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs",
                      u.score >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : u.score >= 30 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>{u.score}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[11px] font-bold px-2 py-1 rounded-md capitalize",
                      u.status === "active"       ? "bg-emerald-100 text-emerald-700"
                      : u.status === "blocked"    ? "bg-red-100 text-red-700"
                      : u.status === "suspended"  ? "bg-orange-100 text-orange-700"
                      : "bg-muted text-muted-foreground"
                    )}>{u.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-bold" onClick={() => openAction(u, "score")}>
                        <TrendingUp className="w-3 h-3 mr-1" />Score
                      </Button>
                      <Button size="sm" className="h-7 px-2 text-xs font-bold" onClick={() => openAction(u, "credit")}>
                        <DollarSign className="w-3 h-3 mr-1" />Credit
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-bold border-orange-300 text-orange-600 hover:bg-orange-50" onClick={() => openAction(u, "suspend")}>
                        <Ban className="w-3 h-3 mr-1" />Suspend
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-bold border-red-300 text-red-600 hover:bg-red-50" onClick={() => openAction(u, "block")}>
                        <UserX className="w-3 h-3 mr-1" />Block
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-bold border-gray-300 text-gray-600" onClick={() => handleShadowBan(u.id)}>
                        <ShieldOff className="w-3 h-3 mr-1" />Shadow
                      </Button>
                      {u.status !== "active" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-bold border-emerald-300 text-emerald-600 hover:bg-emerald-50" onClick={() => handleLift(u.id)}>
                          <Unlock className="w-3 h-3 mr-1" />Lift
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Action dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && closeAction()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionDialog === "score"   && "Update Trust Score"}
              {actionDialog === "credit"  && "Credit Wallet"}
              {actionDialog === "block"   && "Block User"}
              {actionDialog === "suspend" && "Suspend User"}
            </DialogTitle>
            {selectedUser && (
              <DialogDescription className="font-medium">
                {selectedUser.firstName} {selectedUser.lastName} · {selectedUser.email}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold">
                {actionDialog === "score"   && "New Score (0–100)"}
                {actionDialog === "credit"  && "Amount to Credit (₦)"}
                {actionDialog === "block"   && "Block Duration (weeks)"}
                {actionDialog === "suspend" && "Suspension Duration (days)"}
              </label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-11 text-lg font-bold"
                autoFocus
                min={actionDialog === "score" ? 0 : 1}
                max={actionDialog === "score" ? 100 : undefined}
              />
            </div>
            {(actionDialog === "block" || actionDialog === "suspend") && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Reason (optional)</label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter reason…" className="resize-none h-20" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeAction}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={!amount || setScore.isPending || credit.isPending || block.isPending || suspend.isPending}
              className={cn(
                "font-bold",
                actionDialog === "block"   && "bg-red-600 hover:bg-red-700 text-white",
                actionDialog === "suspend" && "bg-orange-500 hover:bg-orange-600 text-white",
              )}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── SUBMISSIONS ─── */
function SubmissionsTab() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useAdminGetSubmissions();
  const approve = useAdminApproveSubmission();
  const decline = useAdminDeclineSubmission();
  const [declineDialog, setDeclineDialog] = useState<any>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [filter, setFilter] = useState<"pending"|"approved"|"declined">("pending");

  const invalidate = () => qc.invalidateQueries({ queryKey: getAdminGetSubmissionsQueryKey() });

  const all = data ?? [];
  const filtered = all.filter((s: any) => s.status === filter);

  const doApprove = (s: any) => {
    approve.mutate({ submissionId: s.id }, {
      onSuccess: () => { toast({ title: "Submission approved ✓" }); invalidate(); },
      onError: (e: any) => toast({ title: e?.data?.error ?? "Failed", variant: "destructive" }),
    });
  };

  const doDecline = () => {
    if (!declineDialog) return;
    decline.mutate({ submissionId: declineDialog.id, data: { reason: declineReason } }, {
      onSuccess: () => { toast({ title: "Submission declined" }); setDeclineDialog(null); setDeclineReason(""); invalidate(); },
      onError: (e: any) => toast({ title: e?.data?.error ?? "Failed", variant: "destructive" }),
    });
  };

  if (error) return <ErrorState message="Failed to load submissions." onRetry={refetch} />;

  const pending  = all.filter((s: any) => s.status === "pending").length;
  const approved = all.filter((s: any) => s.status === "approved").length;
  const declined = all.filter((s: any) => s.status === "declined").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <TabHeader title="Task Submissions" sub="Review user task screenshots" onRefresh={refetch} loading={isLoading} />

      <div className="flex gap-2 flex-wrap">
        {[
          { label: `Pending (${pending})`,  value: "pending"  as const, color: "bg-amber-500" },
          { label: `Approved (${approved})`, value: "approved" as const, color: "bg-emerald-500" },
          { label: `Declined (${declined})`, value: "declined" as const, color: "bg-red-500" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-bold transition-all",
              filter === f.value ? `${f.color} text-white shadow-md` : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingGrid count={3} /> : filtered.length === 0 ? (
        <EmptyState icon={FileCheck} message={`No ${filter} submissions.`} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s: any) => (
            <Card key={s.id} className="overflow-hidden border-border/50">
              <div className={cn("h-1 w-full", s.status === "approved" ? "bg-emerald-500" : s.status === "declined" ? "bg-red-500" : "bg-amber-400")} />
              <div className="bg-muted/30 p-4 border-b border-border/50">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm leading-tight line-clamp-2">{s.task?.title ?? "Unknown Task"}</h4>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">
                      {s.user?.firstName} {s.user?.lastName}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">{s.user?.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">{formatNaira(s.task?.reward ?? 0)}</span>
                    <p className="text-[10px] text-muted-foreground mt-1.5">{formatDate(s.createdAt)}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                {s.screenshots?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {s.screenshots.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border/50 bg-black/5 aspect-square group">
                        <img src={url} alt="Proof" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="h-24 bg-muted/30 border border-dashed border-border rounded-lg flex items-center justify-center text-xs font-semibold text-muted-foreground">No screenshots</div>
                )}
                {s.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-destructive/30 text-destructive hover:bg-destructive hover:text-white h-10 font-bold text-xs"
                      onClick={() => { setDeclineDialog(s); setDeclineReason(""); }}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Decline
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 font-bold text-xs"
                      onClick={() => doApprove(s)}
                      disabled={approve.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  </div>
                )}
                {s.status === "declined" && s.declineReason && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 dark:text-red-400 font-medium">
                    Reason: {s.declineReason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!declineDialog} onOpenChange={(o) => !o && setDeclineDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Decline Submission</DialogTitle>
            <DialogDescription>Provide a reason so the user knows what to fix.</DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <label className="text-sm font-bold">Decline Reason</label>
            <Textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="e.g. Screenshot doesn't show the required action clearly."
              className="resize-none h-24"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeclineDialog(null)}>Cancel</Button>
            <Button variant="destructive" className="font-bold" onClick={doDecline} disabled={!declineReason.trim() || decline.isPending}>
              {decline.isPending ? "Declining…" : "Confirm Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── WITHDRAWALS ─── */
function WithdrawalsTab() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useAdminGetWithdrawals();
  const approve = useAdminApproveWithdrawal();
  const decline = useAdminDeclineWithdrawal();
  const [declineDialog, setDeclineDialog] = useState<any>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [filter, setFilter] = useState<"pending"|"approved"|"declined">("pending");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getAdminGetWithdrawalsQueryKey() });
    qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
  };

  const all = data ?? [];
  // backend uses "pending" and "under_review" — both need admin action
  const isPending = (w: any) => w.status === "pending" || w.status === "under_review";
  const pending  = all.filter(isPending);
  const filtered = filter === "pending"
    ? all.filter(isPending)
    : all.filter((w: any) => w.status === filter);

  const doApprove = (w: any) => {
    approve.mutate({ withdrawalId: w.id, data: { note: "Payment processed" } }, {
      onSuccess: () => { toast({ title: "Withdrawal marked as paid ✓" }); invalidate(); },
      onError: (e: any) => toast({ title: e?.data?.error ?? "Failed", variant: "destructive" }),
    });
  };

  const doDecline = () => {
    if (!declineDialog) return;
    decline.mutate({ withdrawalId: declineDialog.id, data: { note: declineNote } }, {
      onSuccess: () => { toast({ title: "Withdrawal declined — user refunded" }); setDeclineDialog(null); setDeclineNote(""); invalidate(); },
      onError: (e: any) => toast({ title: e?.data?.error ?? "Failed", variant: "destructive" }),
    });
  };

  if (error) return <ErrorState message="Failed to load withdrawals." onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <TabHeader title="Withdrawal Requests" sub={`${pending.length} pending payout${pending.length !== 1 ? "s" : ""}`} onRefresh={refetch} loading={isLoading} />

      <div className="flex gap-2 flex-wrap">
        {(["pending","approved","declined"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-bold transition-all capitalize",
              filter === f
                ? f === "pending" ? "bg-amber-500 text-white" : f === "approved" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f} ({all.filter((w: any) => w.status === f).length})
          </button>
        ))}
      </div>

      {isLoading ? <LoadingGrid count={2} /> : filtered.length === 0 ? (
        <EmptyState icon={Landmark} message={`No ${filter} withdrawals.`} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((w: any) => (
            <Card key={w.id} className="border-border/50">
              <div className={cn("h-1 w-full", w.status === "approved" ? "bg-emerald-500" : w.status === "declined" ? "bg-red-500" : "bg-amber-400")} />
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
                    <h4 className="font-bold font-display text-2xl">{formatNaira(w.amount)}</h4>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-full",
                      w.status === "approved" ? "bg-emerald-100 text-emerald-700" : w.status === "declined" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>{w.status}</span>
                    <p className="text-[10px] text-muted-foreground mt-1.5">{formatDate(w.createdAt)}</p>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-xl p-4 space-y-2.5 text-sm border border-border/30">
                  <InfoRow label="User"       value={`${w.user?.firstName} ${w.user?.lastName}`} />
                  <InfoRow label="Email"      value={w.user?.email} />
                  <InfoRow label="Bank"       value={w.bankName} />
                  <InfoRow label="Acct No."   value={w.accountNumber} highlight />
                  <InfoRow label="Acct Name"  value={w.accountName} />
                </div>
                {w.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-destructive/30 text-destructive hover:bg-destructive hover:text-white h-11 font-bold"
                      onClick={() => { setDeclineDialog(w); setDeclineNote(""); }}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> Decline
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11 font-bold"
                      onClick={() => doApprove(w)}
                      disabled={approve.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Mark as Paid
                    </Button>
                  </div>
                )}
                {w.note && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 border border-border/50">Note: {w.note}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!declineDialog} onOpenChange={(o) => !o && setDeclineDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Decline Withdrawal</DialogTitle>
            <DialogDescription>The user will be refunded (amount + ₦300 fee).</DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <label className="text-sm font-bold">Reason / Note</label>
            <Textarea
              value={declineNote}
              onChange={e => setDeclineNote(e.target.value)}
              placeholder="e.g. Account details mismatch."
              className="resize-none h-20"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeclineDialog(null)}>Cancel</Button>
            <Button variant="destructive" className="font-bold" onClick={doDecline} disabled={!declineNote.trim() || decline.isPending}>
              {decline.isPending ? "Declining…" : "Decline & Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── TASKS ─── */
function TasksTab() {
  const qc = useQueryClient();
  const { data: tasksData, isLoading, error, refetch } = useGetTasks();
  const createTask  = useCreateTask();
  const deleteTask  = useDeleteTask();
  const renewTask   = useRenewTask();
  const extendTask  = useExtendTask();
  const [createOpen, setCreateOpen] = useState(false);
  const [extendDialog, setExtendDialog] = useState<any>(null);
  const [extendSlots, setExtendSlots] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });

  const SOCIALS = ["instagram","twitter","tiktok","youtube","facebook","telegram","whatsapp","linkedin"];
  const CATS = ["follow","like","comment","share","subscribe","view","repost","other"];

  const [form, setForm] = useState({
    title: "", description: "", socialMedia: "instagram", category: "follow",
    targetUrl: "", reward: "", maxPerformers: "20",
  });

  const handleCreate = () => {
    createTask.mutate({
      data: {
        title: form.title,
        description: form.description,
        socialMedia: form.socialMedia as any,
        category: form.category as any,
        link: form.targetUrl,
        tags: [],
        reward: Number(form.reward),
        maxPerformers: Number(form.maxPerformers),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Task created ✓" });
        setCreateOpen(false);
        setForm({ title: "", description: "", socialMedia: "instagram", category: "follow", targetUrl: "", reward: "", maxPerformers: "20" });
        invalidate();
      },
      onError: (e: any) => toast({ title: e?.data?.error ?? "Failed to create task", variant: "destructive" }),
    });
  };

  const handleDelete = (taskId: number) => {
    if (!confirm("Delete this task?")) return;
    deleteTask.mutate({ taskId }, {
      onSuccess: () => { toast({ title: "Task deleted" }); invalidate(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  };

  const handleRenew = (taskId: number) => {
    renewTask.mutate({ taskId }, {
      onSuccess: () => { toast({ title: "Task renewed ✓" }); invalidate(); },
      onError: (e: any) => toast({ title: e?.data?.error ?? "Failed", variant: "destructive" }),
    });
  };

  const handleExtend = () => {
    if (!extendDialog || !extendSlots) return;
    extendTask.mutate({ taskId: extendDialog.id, data: { additionalPerformers: Number(extendSlots) } }, {
      onSuccess: () => { toast({ title: "Slots extended ✓" }); setExtendDialog(null); setExtendSlots(""); invalidate(); },
      onError: (e: any) => toast({ title: e?.data?.error ?? "Failed", variant: "destructive" }),
    });
  };

  const tasks = tasksData ?? [];

  if (error) return <ErrorState message="Failed to load tasks." onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <TabHeader title="Manage Tasks" sub={`${tasks.length} active tasks`} onRefresh={refetch} loading={isLoading}>
        <Button className="font-bold h-9" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Task
        </Button>
      </TabHeader>

      {isLoading ? <LoadingGrid count={3} /> : tasks.length === 0 ? (
        <EmptyState icon={ListTodo} message="No tasks yet. Create the first one." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((t: any) => (
            <Card key={t.id} className="overflow-hidden border-border/50">
              <div className="h-1 w-full bg-primary" />
              <CardContent className="p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-sm leading-tight line-clamp-2">{t.title}</h4>
                  <p className="text-xs text-muted-foreground capitalize mt-1">{t.socialMedia} · {t.category}</p>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">{formatNaira(t.reward)}</span>
                  <span className="text-muted-foreground">{t.performerCount ?? 0}/{t.maxPerformers} performers</span>
                </div>
                {t.link && (
                  <a href={t.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate block">{t.link}</a>
                )}
                <div className="flex gap-1.5 flex-wrap pt-1 border-t border-border/50">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-bold" onClick={() => handleRenew(t.id)}>
                    <RefreshCw className="w-3 h-3 mr-1" />Renew
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-bold" onClick={() => { setExtendDialog(t); setExtendSlots(""); }}>
                    <Plus className="w-3 h-3 mr-1" />Extend
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
          <div className="py-3 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Follow our Instagram page" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Description</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Task instructions…" className="resize-none h-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Platform</label>
                <Select value={form.socialMedia} onValueChange={v => setForm(f => ({...f, socialMedia: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOCIALS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Action</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Target URL</label>
              <Input value={form.targetUrl} onChange={e => setForm(f => ({...f, targetUrl: e.target.value}))} placeholder="https://…" type="url" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Reward (₦)</label>
                <Input type="number" value={form.reward} onChange={e => setForm(f => ({...f, reward: e.target.value}))} placeholder="0" min="0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Max Performers</label>
                <Input type="number" value={form.maxPerformers} onChange={e => setForm(f => ({...f, maxPerformers: e.target.value}))} min="1" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="font-bold" onClick={handleCreate} disabled={!form.title || !form.targetUrl || createTask.isPending}>
              {createTask.isPending ? "Creating…" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={!!extendDialog} onOpenChange={(o) => !o && setExtendDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Extend Task Slots</DialogTitle>
            <DialogDescription>{extendDialog?.title}</DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <label className="text-sm font-bold">Additional Performer Slots</label>
            <Input type="number" value={extendSlots} onChange={e => setExtendSlots(e.target.value)} placeholder="e.g. 10" min="1" autoFocus />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExtendDialog(null)}>Cancel</Button>
            <Button className="font-bold" onClick={handleExtend} disabled={!extendSlots || extendTask.isPending}>
              {extendTask.isPending ? "Extending…" : "Extend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── DAILY DUES ─── */
function DailyDuesTab() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useAdminGetAllDailyDues();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [payDates, setPayDates] = useState<string[]>([]);

  // Note: PATCH /admin/daily-dues/:userId — use a direct fetch since there's no generated mutation for this
  const markPaid = async () => {
    if (!selected || payDates.length === 0) return;
    const token = localStorage.getItem("nm_token");
    const res = await fetch(`/api/admin/daily-dues/${selected.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dates: payDates }),
    });
    if (res.ok) {
      toast({ title: "Dues marked as paid ✓" });
      setSelected(null);
      setPayDates([]);
      qc.invalidateQueries({ queryKey: getAdminGetAllDailyDuesQueryKey() });
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error ?? "Failed", variant: "destructive" });
    }
  };

  const rows = (data ?? []).filter((r: any) => {
    const q = search.toLowerCase();
    return !q || `${r.user?.firstName} ${r.user?.lastName} ${r.user?.email}`.toLowerCase().includes(q);
  });

  if (error) return <ErrorState message="Failed to load daily dues." onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <TabHeader title="Daily Dues Ledger" sub="Track and manage member dues" onRefresh={refetch} loading={isLoading}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search member…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 w-full sm:w-56" />
        </div>
      </TabHeader>

      {isLoading ? <LoadingGrid count={4} /> : rows.length === 0 ? (
        <EmptyState icon={Wallet} message="No dues records found." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Member</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-red-600">Owed</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-emerald-600">Paid</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Records</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r: any) => (
                  <tr key={r.userId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-sm">{r.user?.firstName} {r.user?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-red-600">
                      {r.totalOwed > 0 ? formatNaira(r.totalOwed) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-600">
                      {r.totalPaid > 0 ? formatNaira(r.totalPaid) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                      {r.dues?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-bold" onClick={() => { setSelected(r); setPayDates([]); }}>
                        <Eye className="w-3 h-3 mr-1" />View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dues Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dues — {selected?.user?.firstName} {selected?.user?.lastName}</DialogTitle>
            <DialogDescription>
              Owed: <strong className="text-red-600">{formatNaira(selected?.totalOwed ?? 0)}</strong> · Paid: <strong className="text-emerald-600">{formatNaira(selected?.totalPaid ?? 0)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-80 overflow-y-auto">
            {!selected?.dues || selected.dues.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No dues records for this user.</p>
            ) : selected.dues.map((d: any) => (
              <label key={d.id} className={cn(
                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                d.paid ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40",
                !d.paid && "hover:bg-red-100/80 dark:hover:bg-red-950/40"
              )}>
                <div className="flex items-center gap-3">
                  {!d.paid && (
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded"
                      checked={payDates.includes(d.date)}
                      onChange={e => setPayDates(prev => e.target.checked ? [...prev, d.date] : prev.filter(x => x !== d.date))}
                    />
                  )}
                  {d.paid && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                  <div>
                    <p className="font-bold text-sm">{d.date}</p>
                    <p className="text-xs text-muted-foreground">{formatNaira(d.amount)}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  d.paid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                )}>{d.paid ? "Paid" : "Unpaid"}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {payDates.length > 0 && (
              <Button className="font-bold bg-emerald-600 hover:bg-emerald-700" onClick={markPaid}>
                Mark {payDates.length} as Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── SETTINGS ─── */
function SettingsTab() {
  const qc = useQueryClient();
  const { data: settings, isLoading, error } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  const save = () => {
    updateSettings.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Configuration saved ✓" });
        qc.invalidateQueries({ queryKey: ["/api/settings"] });
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  };

  if (error) return <ErrorState message="Failed to load settings." />;
  if (isLoading) return <LoadingGrid count={4} />;

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
      <TabHeader title="Platform Configuration" sub="Manage fees, thresholds, and toggles" />
      <Card>
        <div className="bg-primary/5 p-4 border-b border-primary/10">
          <h3 className="font-bold text-primary flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Financial Variables</h3>
        </div>
        <CardContent className="p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Daily Due Amount (₦)",  key: "dailyDueAmount" },
              { label: "Task Creation Fee (₦)", key: "taskCreationFee" },
              { label: "Monday Promo Fee (₦)",  key: "promoFee" },
              { label: "Min Withdrawal (₦)",    key: "minWithdrawal" },
              { label: "Withdrawal Fee (₦)",    key: "withdrawalFee" },
            ].map(({ label, key }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-bold">{label}</label>
                <Input
                  type="number"
                  value={formData[key] ?? ""}
                  onChange={e => setFormData((f: any) => ({...f, [key]: Number(e.target.value)}))}
                  className="h-11 font-semibold"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <p className="font-bold">Enable Daily Dues</p>
              <p className="text-sm text-muted-foreground">Charge members daily for task activity</p>
            </div>
            <Switch checked={!!formData.dailyDuesEnabled} onCheckedChange={c => setFormData((f: any) => ({...f, dailyDuesEnabled: c}))} />
          </div>
        </CardContent>
        <div className="p-4 bg-muted/30 border-t border-border/50 text-right">
          <Button onClick={save} disabled={updateSettings.isPending} className="h-11 px-8 font-bold">
            {updateSettings.isPending ? "Saving…" : "Save Configuration"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ─── Shared helpers ─── */
function TabHeader({ title, sub, onRefresh, loading, children }: {
  title: string; sub?: string; onRefresh?: () => void; loading?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border/50">
      <div>
        <h2 className="text-2xl font-display font-bold">{title}</h2>
        {sub && <p className="text-muted-foreground text-sm mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onRefresh && (
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onRefresh}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground font-semibold text-sm">{label}:</span>
      <span className={cn("font-bold text-sm", highlight && "text-primary font-display tracking-widest")}>{value}</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <AlertCircle className="w-10 h-10 text-destructive opacity-60" />
      <p className="text-sm font-medium text-center max-w-xs">{message}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw className="w-4 h-4 mr-1.5" />Retry</Button>}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
      <Icon className="w-10 h-10 opacity-25" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}

function LoadingGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid gap-4", count <= 2 ? "grid-cols-1 sm:grid-cols-2" : count <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
