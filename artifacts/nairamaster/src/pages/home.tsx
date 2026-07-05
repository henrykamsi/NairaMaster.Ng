import { useAuth } from "@/hooks/use-auth"
import {
  useGetWallet, useGetMyScore, useGetMyDebt, useRefreshWallet,
  useGetMyDailyDues, useGetBanners, useGetWithdrawals, useGetSubmissions,
} from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Eye, EyeOff, RefreshCw, Plus, ArrowDownToLine, MessageCircle,
  AlertCircle, X, TrendingUp, Banknote, CheckCircle2, Clock, XCircle,
  ChevronRight, FileText, Bell,
} from "lucide-react"
import { useState, useEffect } from "react"
import { formatNaira, cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useRequestWithdrawal, getGetWalletQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"
import { Link } from "wouter"

/* ── Score helpers ── */
function getScoreConfig(score: number) {
  if (score >= 70) return { color: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", track: "bg-emerald-100 dark:bg-emerald-900/30", label: "Good Standing", labelColor: "text-emerald-600 dark:text-emerald-400" }
  if (score >= 30) return { color: "text-amber-500", bar: "bg-amber-400",   track: "bg-amber-100 dark:bg-amber-900/30",   label: "Observation Mode", labelColor: "text-amber-600 dark:text-amber-400" }
  if (score >= 15) return { color: "text-orange-500", bar: "bg-orange-400", track: "bg-orange-100 dark:bg-orange-900/30", label: "At Risk",           labelColor: "text-orange-600 dark:text-orange-400" }
  return { color: "text-red-600 dark:text-red-400", bar: "bg-red-500", track: "bg-red-100 dark:bg-red-900/30", label: "Critical — Restricted", labelColor: "text-red-600 dark:text-red-400" }
}

/* ── Submission quick-stat strip ── */
function SubmissionStrip() {
  const { data } = useGetSubmissions()
  const approved = data?.approved?.length ?? 0
  const pending  = data?.pending?.length ?? 0
  const declined = data?.declined?.length ?? 0

  return (
    <div className="grid grid-cols-3 gap-3">
      <Link href="/submissions?tab=approved">
        <Card className="hover:border-emerald-400 transition-colors cursor-pointer group border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">{approved}</span>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/submissions?tab=pending">
        <Card className="hover:border-amber-400 transition-colors cursor-pointer group border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-2xl font-bold font-display text-amber-600 dark:text-amber-400">{pending}</span>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/submissions?tab=declined">
        <Card className="hover:border-red-400 transition-colors cursor-pointer group border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <XCircle className="w-4 h-4" />
            </div>
            <span className="text-2xl font-bold font-display text-red-500">{declined}</span>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Declined</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

export function Home() {
  const { user } = useAuth()
  const { data: wallet, isLoading: isWalletLoading } = useGetWallet()
  const { data: scoreData } = useGetMyScore()
  const { data: debtData } = useGetMyDebt()
  const { data: duesData } = useGetMyDailyDues()
  const { data: banners } = useGetBanners()
  const { data: withdrawals } = useGetWithdrawals()

  const refreshWallet = useRefreshWallet()
  const queryClient = useQueryClient()

  const [showBalance, setShowBalance] = useState(true)
  const [addMoneyOpen, setAddMoneyOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [duesPopupOpen, setDuesPopupOpen] = useState(false)
  const [dismissedBanners, setDismissedBanners] = useState<number[]>([])

  useEffect(() => {
    if (debtData && debtData.totalDebt > 0) setDuesPopupOpen(true)
  }, [debtData])

  const timeHour = new Date().getHours()
  const greeting = timeHour < 12 ? "Good morning" : timeHour < 18 ? "Good afternoon" : "Good evening"

  const score = scoreData?.score ?? 30
  const scoreConfig = getScoreConfig(score)

  const approvedWithdrawals = (withdrawals ?? []).filter((w: any) => w.status === "approved")
  const pendingWithdrawals  = (withdrawals ?? []).filter((w: any) => w.status === "pending")
  const totalWithdrawn = approvedWithdrawals.reduce((s: number, w: any) => s + Number(w.amount), 0)
  const totalPending   = pendingWithdrawals.reduce((s: number, w: any) => s + Number(w.amount), 0)

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* ── Banners ── */}
      {banners?.filter((b: any) => b.active && !dismissedBanners.includes(b.id)).map((banner: any) => (
        <div key={banner.id} className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex justify-between items-start gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-primary mb-1">{banner.title}</h3>
            <p className="text-sm text-foreground/80">{banner.content}</p>
            {banner.ctaText && banner.ctaLink && (
              <a href={banner.ctaLink} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">
                {banner.ctaText} →
              </a>
            )}
          </div>
          <button onClick={() => setDismissedBanners(prev => [...prev, banner.id])} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* ── Greeting ── */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          {greeting}, {user?.firstName} 👋
        </h1>
        <p className="text-muted-foreground text-sm">Ready to make money today?</p>
      </div>

      {/* ── Wallet Card ── */}
      <Card className="bg-gradient-to-br from-primary to-[#0A3D21] text-primary-foreground border-0 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <div className="w-40 h-40 rounded-full border-[20px] border-white/20 -translate-y-1/2 translate-x-1/2" />
        </div>
        <div className="absolute bottom-0 left-0 opacity-5 pointer-events-none">
          <div className="w-28 h-28 rounded-full border-[14px] border-white translate-y-1/2 -translate-x-1/2" />
        </div>
        <CardContent className="p-6 sm:p-8 flex flex-col gap-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-primary-foreground/70 font-semibold text-xs uppercase tracking-widest">Total Balance</p>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight">
                  {isWalletLoading ? "₦ —" : showBalance ? formatNaira(wallet?.balance ?? 0) : "₦ ••••••"}
                </h2>
                <button onClick={() => setShowBalance(!showBalance)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              onClick={() => refreshWallet.mutate(undefined, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() }) })}
              className={cn("p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all", refreshWallet.isPending && "animate-spin")}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="h-12 w-full font-bold shadow-lg" onClick={() => setAddMoneyOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Money
            </Button>
            <Button
              className="h-12 w-full font-bold bg-white/10 hover:bg-white/20 text-white shadow-none border border-white/20"
              onClick={() => {
                if (debtData && debtData.totalDebt > 0) {
                  toast({ title: "Action Blocked", description: "Please pay your daily dues first. Contact admin.", variant: "destructive" })
                  return
                }
                setWithdrawOpen(true)
              }}
            >
              <ArrowDownToLine className="w-4 h-4 mr-2" /> Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Submission Stats (separate from tasks) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">My Task Status</h2>
          <Link href="/submissions" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <SubmissionStrip />
      </div>

      {/* ── Score Card ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">My Score</p>
              <h3 className={cn("text-2xl font-bold font-display", scoreConfig.color)}>{score}<span className="text-base font-medium text-muted-foreground">/100</span></h3>
            </div>
            <div className={cn("px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1", scoreConfig.track, scoreConfig.labelColor)}>
              <TrendingUp className="w-3 h-3" />
              {scoreConfig.label}
            </div>
          </div>
          <div className={cn("w-full h-2.5 rounded-full overflow-hidden", scoreConfig.track)}>
            <div
              className={cn("h-full rounded-full transition-all duration-700", scoreConfig.bar)}
              style={{ width: `${Math.max(2, score)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {score >= 70 ? "Keep up the great work!" : score >= 30 ? "Your account is being observed. Maintain good task performance." : "Your account is at risk. Please improve your submission quality."}
          </p>
        </CardContent>
      </Card>

      {/* ── Micro Debt ── */}
      {debtData && debtData.totalDebt > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-destructive text-sm">Daily Dues Owed</p>
                <p className="text-xl font-bold font-display text-destructive">{formatNaira(debtData.totalDebt)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pay to unlock withdrawals</p>
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={() => setAddMoneyOpen(true)}>Pay Now</Button>
          </CardContent>
        </Card>
      )}

      {/* ── Withdrawal Logs ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Withdrawal Logs</h2>
          <Link href="/withdrawal-logs" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 divide-x divide-border">
              <Link href="/withdrawal-logs" className="block">
                <div className="p-4 sm:p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Pending</p>
                  <p className="text-xl font-bold font-display text-amber-500">{formatNaira(totalPending)}</p>
                  {pendingWithdrawals.length > 0 && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                      <Clock className="w-2.5 h-2.5" /> Under Review
                    </span>
                  )}
                </div>
              </Link>
              <Link href="/withdrawal-logs" className="block">
                <div className="p-4 sm:p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Withdrawn</p>
                  <p className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">{formatNaira(totalWithdrawn)}</p>
                  {approvedWithdrawals.length > 0 && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Paid Out
                    </span>
                  )}
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Links (Updates & Docs) ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/updates">
          <Card className="hover:border-primary/40 transition-colors cursor-pointer group h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm">Updates</p>
                <p className="text-xs text-muted-foreground">Latest news</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs">
          <Card className="hover:border-primary/40 transition-colors cursor-pointer group h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm">Docs</p>
                <p className="text-xs text-muted-foreground">How it works</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Contact ── */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Need Help?</h4>
              <p className="text-xs text-muted-foreground">Chat on WhatsApp</p>
            </div>
          </div>
          <a href="https://wa.me/2349118310148" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" className="font-bold">Contact Us</Button>
          </a>
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      <AddMoneyModal open={addMoneyOpen} onOpenChange={setAddMoneyOpen} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={wallet?.balance ?? 0} />

      <Dialog open={duesPopupOpen} onOpenChange={setDuesPopupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Daily Dues Required</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">Dear {user?.firstName}, you owe <strong>{formatNaira(debtData?.totalDebt ?? 0)}</strong> in daily dues. Please pay to continue performing tasks and withdrawing funds.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDuesPopupOpen(false)}>Close</Button>
            <Button onClick={() => { setDuesPopupOpen(false); setAddMoneyOpen(true) }}>Add Money</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Add Money Modal ── */
function AddMoneyModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl">Add Money</DialogTitle>
          <DialogDescription>Transfer to the account below to fund your wallet.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted rounded-xl p-4 space-y-3 border border-border/50">
            <div className="flex justify-between items-center border-b border-border/50 pb-2.5">
              <span className="text-sm text-muted-foreground">Bank Name</span>
              <span className="font-bold text-foreground">OPAY</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/50 pb-2.5">
              <span className="text-sm text-muted-foreground">Account Number</span>
              <span className="font-bold text-primary text-lg font-display tracking-wide">9118310148</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Account Name</span>
              <span className="font-bold text-xs uppercase tracking-wider">HENRY KAMSI OKWUABUDIKE</span>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">After transferring, click the button below to notify admin for confirmation.</p>
        </div>
        <DialogFooter>
          <a href="https://wa.me/2349118310148?text=Hello%2C+I+have+just+made+a+transfer+to+fund+my+NairaMaster.ng+wallet." target="_blank" rel="noreferrer" className="w-full">
            <Button className="w-full h-12 text-base font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white">
              <MessageCircle className="w-5 h-5 mr-2" /> I Have Made the Transfer
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Withdraw Modal ── */
function WithdrawModal({ open, onOpenChange, balance }: { open: boolean; onOpenChange: (open: boolean) => void; balance: number }) {
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState("")
  const [bank, setBank] = useState("")
  const [accNo, setAccNo] = useState("")
  const [accName, setAccName] = useState("")
  const withdraw = useRequestWithdrawal()

  useEffect(() => { if (!open) { setStep(1); setAmount(""); setBank(""); setAccNo(""); setAccName("") } }, [open])

  const submit = () => {
    if (Number(amount) < 3000) { toast({ title: "Invalid Amount", description: "Minimum withdrawal is ₦3,000.", variant: "destructive" }); return }
    if (balance < Number(amount) + 300) { toast({ title: "Insufficient Balance", description: `You need ₦${Number(amount) + 300} (amount + ₦300 fee).`, variant: "destructive" }); return }
    setStep(5)
    setTimeout(() => {
      withdraw.mutate({ data: { amount: Number(amount), bankName: bank, accountNumber: accNo, accountName: accName } }, {
        onSuccess: () => setStep(6),
        onError: () => { toast({ title: "Error", description: "Failed to submit withdrawal.", variant: "destructive" }); setStep(4) }
      })
    }, 1800)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (step !== 5) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Withdraw Funds</DialogTitle></DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Enter your bank details for this withdrawal.</p>
            <div className="space-y-2"><label className="text-sm font-semibold">Bank Name</label><Input placeholder="e.g. OPAY, Access Bank" value={bank} onChange={e => setBank(e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-semibold">Account Number</label><Input type="number" placeholder="10-digit account number" value={accNo} onChange={e => setAccNo(e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-semibold">Account Name</label><Input placeholder="Name on the account" value={accName} onChange={e => setAccName(e.target.value)} /></div>
            <Button className="w-full h-12 font-bold mt-2" onClick={() => setStep(2)} disabled={!bank || accNo.length < 10 || !accName}>Next →</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/60 rounded-xl p-3 text-sm">
              <p className="text-muted-foreground text-xs mb-1">Available Balance</p>
              <p className="font-bold text-lg font-display">{formatNaira(balance)}</p>
            </div>
            <div className="space-y-2"><label className="text-sm font-semibold">Amount to Withdraw</label><Input type="number" placeholder="Min ₦3,000" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            {amount && Number(amount) >= 3000 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">{formatNaira(Number(amount))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Processing fee</span><span className="font-bold text-destructive">₦300.00</span></div>
                <div className="flex justify-between border-t border-border/50 pt-1 mt-1"><span className="font-semibold">Total Deducted</span><span className="font-bold">{formatNaira(Number(amount) + 300)}</span></div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
              <Button className="flex-1 font-bold" onClick={() => setStep(3)} disabled={!amount || Number(amount) < 3000}>Review →</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
            <h3 className="font-bold text-center text-muted-foreground text-sm uppercase tracking-wider">Confirm Details</h3>
            <div className="bg-muted rounded-xl p-4 space-y-2.5 text-sm border border-border/50">
              <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-bold">{bank}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-bold">{accNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-bold">{accName}</span></div>
              <div className="flex justify-between border-t border-border/50 pt-2.5"><span className="text-muted-foreground">Withdrawal</span><span className="font-bold text-primary text-base">{formatNaira(Number(amount))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-bold text-destructive">₦300.00</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← Back</Button>
              <Button className="flex-1 font-bold h-12" onClick={submit}>Submit Request</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-semibold text-primary animate-pulse">Submitting your request...</p>
          </div>
        )}

        {step === 6 && (
          <div className="py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold font-display">Request Submitted!</h3>
            <p className="text-muted-foreground text-sm">Your withdrawal is now under review. You'll be notified once it's approved.</p>
            <Button className="w-full mt-2 h-12 font-bold" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
