import { useAuth } from "@/hooks/use-auth"
import { useGetWallet, useGetMyScore, useGetMyDebt, useRefreshWallet, useGetMyDailyDues, useGetBanners } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, RefreshCw, Plus, ArrowDownToLine, MessageCircle, AlertCircle, X } from "lucide-react"
import { useState, useEffect } from "react"
import { formatNaira, cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useRequestWithdrawal, getGetWalletQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"
import { Link } from "wouter"
import { Label } from "recharts"

export function Home() {
  const { user } = useAuth()
  const { data: wallet, isLoading: isWalletLoading } = useGetWallet()
  const { data: scoreData } = useGetMyScore()
  const { data: debtData } = useGetMyDebt()
  const { data: duesData } = useGetMyDailyDues()
  const { data: banners } = useGetBanners()
  
  const refreshWallet = useRefreshWallet()
  const queryClient = useQueryClient()

  const [showBalance, setShowBalance] = useState(true)
  const [addMoneyOpen, setAddMoneyOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [duesPopupOpen, setDuesPopupOpen] = useState(false)

  useEffect(() => {
    // Show daily dues popup on load if owed
    if (debtData && debtData.totalDebt > 0) {
      setDuesPopupOpen(true)
    }
  }, [debtData])

  const timeHour = new Date().getHours()
  const greeting = timeHour < 12 ? "Good morning" : timeHour < 18 ? "Good afternoon" : "Good evening"

  const score = scoreData?.score ?? 0
  const scoreColor = score < 15 ? "text-destructive" : score < 50 ? "text-warning" : score < 70 ? "text-yellow-500" : "text-success"

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {banners?.filter(b => b.active).map(banner => (
        <div key={banner.id} className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-primary mb-1">{banner.title}</h3>
            <p className="text-sm text-foreground/80">{banner.content}</p>
            {banner.ctaText && banner.ctaLink && (
              <a href={banner.ctaLink} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">
                {banner.ctaText}
              </a>
            )}
          </div>
          <button className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
      ))}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          {greeting}, {user?.firstName}
        </h1>
        <p className="text-muted-foreground">Ready to make money today?</p>
      </div>

      <Card className="bg-gradient-to-br from-primary to-[#0A3D21] text-primary-foreground border-0 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <div className="w-32 h-32 rounded-full border-[16px] border-white/20 -translate-y-1/2 translate-x-1/2"></div>
        </div>
        <CardContent className="p-6 sm:p-8 flex flex-col gap-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-primary-foreground/80 font-medium text-sm uppercase tracking-wider">Total Balance</p>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight">
                  {isWalletLoading ? "₦---" : showBalance ? formatNaira(wallet?.balance || 0) : "₦****.**"}
                </h2>
                <button onClick={() => setShowBalance(!showBalance)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                  {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button 
              onClick={() => {
                refreshWallet.mutate(undefined, {
                  onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() })
                })
              }} 
              className={cn("p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all", refreshWallet.isPending && "animate-spin")}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-2">
            <Button 
              variant="secondary" 
              className="h-12 w-full font-bold shadow-lg"
              onClick={() => setAddMoneyOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" /> Add Money
            </Button>
            <Button 
              className="h-12 w-full font-bold bg-white/10 hover:bg-white/20 text-white shadow-none border border-white/20"
              onClick={() => {
                if (debtData && debtData.totalDebt > 0) {
                  toast({ title: "Action Blocked", description: "Please pay your daily dues. Contact the admin.", variant: "destructive" })
                  return
                }
                setWithdrawOpen(true)
              }}
            >
              <ArrowDownToLine className="w-5 h-5 mr-2" /> Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Link href="/tasks?filter=approved">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="font-bold text-lg">A</span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tasks?filter=pending">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="font-bold text-lg">P</span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tasks?filter=declined">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="font-bold text-lg">D</span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Declined</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">My Score</p>
              <h3 className={cn("text-2xl font-bold font-display", scoreColor)}>{score}/100</h3>
              {score < 15 && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Account at risk</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Micro Debt</p>
              <h3 className="text-2xl font-bold font-display text-destructive">{formatNaira(debtData?.totalDebt || 0)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Unpaid daily dues</p>
            </div>
            {debtData?.totalDebt ? (
              <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => setAddMoneyOpen(true)}>Pay Now</Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="p-4 sm:p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
              <p className="text-sm font-medium text-muted-foreground mb-2">Pending Withdrawals</p>
              <p className="text-xl font-bold">₦0.00</p>
            </div>
            <div className="p-4 sm:p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
              <p className="text-sm font-medium text-muted-foreground mb-2">Withdrawn</p>
              <p className="text-xl font-bold text-success">₦0.00</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-foreground">Need Help?</h4>
              <p className="text-sm text-muted-foreground">Click to chat on WhatsApp</p>
            </div>
          </div>
          <a href="https://wa.me/2349118310148" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" className="font-semibold">Contact Us</Button>
          </a>
        </CardContent>
      </Card>

      <AddMoneyModal open={addMoneyOpen} onOpenChange={setAddMoneyOpen} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={wallet?.balance || 0} />
      
      <Dialog open={duesPopupOpen} onOpenChange={setDuesPopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daily Dues Required</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">Dear {user?.firstName}, please pay your daily dues to continue performing tasks. Click Add Money or contact admin.</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDuesPopupOpen(false)}>Close</Button>
            <Button onClick={() => { setDuesPopupOpen(false); setAddMoneyOpen(true); }}>Add Money</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddMoneyModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl">Add Money</DialogTitle>
          <DialogDescription>Transfer funds to the account below to fund your wallet.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground text-sm">Bank Name</span>
              <span className="font-bold">OPAY</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground text-sm">Account Number</span>
              <span className="font-bold text-primary text-lg">9118310148</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Account Name</span>
              <span className="font-bold uppercase">HENRY KAMSI OKWUABUDIKE</span>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground">Please make the transfer then click the button below to notify admin.</p>
        </div>
        <DialogFooter>
          <a href="https://wa.me/2349118310148?text=Hello,%20I%20have%20made%20a%20transfer%20to%20fund%20my%20wallet." target="_blank" rel="noreferrer" className="w-full">
            <Button className="w-full h-12 text-base font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white">I Have Made the Transfer</Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WithdrawModal({ open, onOpenChange, balance }: { open: boolean; onOpenChange: (open: boolean) => void, balance: number }) {
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState("")
  const [bank, setBank] = useState("")
  const [accNo, setAccNo] = useState("")
  const [accName, setAccName] = useState("")
  
  const withdraw = useRequestWithdrawal()

  useEffect(() => {
    if (!open) { setStep(1); setAmount(""); setBank(""); setAccNo(""); setAccName(""); }
  }, [open])

  const submit = () => {
    if (balance < Number(amount) + 300) {
      toast({ title: "Insufficient Balance", description: "You need enough to cover the amount + ₦300 fee.", variant: "destructive" })
      return
    }
    if (Number(amount) < 3000) {
      toast({ title: "Invalid Amount", description: "Minimum withdrawal is ₦3,000.", variant: "destructive" })
      return
    }

    setStep(5)
    setTimeout(() => {
      withdraw.mutate({ data: { amount: Number(amount), bankName: bank, accountNumber: accNo, accountName: accName } }, {
        onSuccess: () => {
          setStep(6)
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to submit withdrawal request.", variant: "destructive" })
          setStep(4)
        }
      })
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if(step !== 5) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
        </DialogHeader>
        
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input placeholder="e.g. OPAY" value={bank} onChange={e => setBank(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input type="number" placeholder="10 digits" value={accNo} onChange={e => setAccNo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input placeholder="e.g. John Doe" value={accName} onChange={e => setAccName(e.target.value)} />
            </div>
            <Button className="w-full mt-4" onClick={() => setStep(2)} disabled={!bank || accNo.length < 10 || !accName}>Next</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">Available Balance: <strong className="text-foreground">{formatNaira(balance)}</strong></p>
            <div className="space-y-2 text-left">
              <Label>Amount to Withdraw</Label>
              <Input type="number" placeholder="Min ₦3,000" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!amount || Number(amount) < 3000}>Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground text-sm">Amount</span>
                <span className="font-bold">{formatNaira(Number(amount))}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground text-sm">Processing Fee</span>
                <span className="font-bold text-destructive">₦300.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Total Deducted</span>
                <span className="font-bold">{formatNaira(Number(amount) + 300)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(4)}>Confirm</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 py-4">
            <h3 className="text-lg font-bold text-center mb-4">Final Summary</h3>
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-2 text-sm">
              <p><strong>Bank:</strong> {bank}</p>
              <p><strong>Account No:</strong> {accNo}</p>
              <p><strong>Name:</strong> {accName}</p>
              <p><strong>Withdrawal:</strong> {formatNaira(Number(amount))}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Back</Button>
              <Button className="flex-1" onClick={submit}>Submit Request</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold text-lg text-primary animate-pulse">Submitting...</p>
          </div>
        )}

        {step === 6 && (
          <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 text-success flex items-center justify-center mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-2xl font-bold font-display">Withdrawal Submitted</h3>
            <p className="text-muted-foreground">Your request is now under review. You will be credited shortly.</p>
            <Button className="w-full mt-4" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
