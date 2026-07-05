import { useGetWithdrawals } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, ArrowLeft, Banknote, AlertCircle } from "lucide-react"
import { cn, formatNaira, formatDate } from "@/lib/utils"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"

function WithdrawalStatusBadge({ status }: { status: string }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <CheckCircle2 className="w-3 h-3" /> Paid
    </span>
  )
  if (status === "declined") return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <XCircle className="w-3 h-3" /> Declined
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <Clock className="w-3 h-3" /> Under Review
    </span>
  )
}

function WithdrawalCard({ withdrawal, userName }: { withdrawal: any; userName: string }) {
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      withdrawal.status === "approved" && "border-emerald-200 dark:border-emerald-800/40",
      withdrawal.status === "declined" && "border-red-200 dark:border-red-800/40",
      withdrawal.status === "pending" && "border-amber-200 dark:border-amber-800/40",
    )}>
      <div className={cn("h-1 w-full",
        withdrawal.status === "approved" && "bg-emerald-500",
        withdrawal.status === "declined" && "bg-red-500",
        withdrawal.status === "pending" && "bg-amber-400",
      )} />
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              withdrawal.status === "approved" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
              withdrawal.status === "declined" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
              withdrawal.status === "pending" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
            )}>
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">{userName}</p>
              <p className="text-xs text-muted-foreground font-medium">{withdrawal.bankName} · {withdrawal.accountNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(withdrawal.createdAt)}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={cn(
              "font-bold text-lg font-display",
              withdrawal.status === "approved" && "text-emerald-600 dark:text-emerald-400",
              withdrawal.status === "declined" && "text-red-500",
              withdrawal.status === "pending" && "text-amber-600 dark:text-amber-400",
            )}>
              {formatNaira(withdrawal.amount)}
            </p>
            <WithdrawalStatusBadge status={withdrawal.status} />
          </div>
        </div>

        {withdrawal.status === "declined" && withdrawal.note && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-400 font-medium">{withdrawal.note}</p>
          </div>
        )}

        {withdrawal.status === "pending" && (
          <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-2.5 flex items-center justify-between">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Your request is being processed
            </p>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">Under Review</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function WithdrawalLogs() {
  const { data: withdrawals, isLoading } = useGetWithdrawals()
  const { user } = useAuth()
  const [, setLocation] = useLocation()
  const userName = user ? `${user.firstName} ${user.lastName}` : "You"

  const approved = (withdrawals ?? []).filter((w: any) => w.status === "approved")
  const pending = (withdrawals ?? []).filter((w: any) => w.status === "pending")
  const declined = (withdrawals ?? []).filter((w: any) => w.status === "declined")
  const totalApproved = approved.reduce((s: number, w: any) => s + w.amount, 0)
  const totalPending = pending.reduce((s: number, w: any) => s + w.amount, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Withdrawal Logs</h1>
          <p className="text-muted-foreground text-sm">History of all your withdrawal requests</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Paid Out</p>
            <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatNaira(totalApproved)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{approved.length} request{approved.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Pending</p>
            <p className="font-bold text-lg text-amber-600 dark:text-amber-400">{formatNaira(totalPending)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pending.length} request{pending.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Declined</p>
            <p className="font-bold text-lg text-red-500">{declined.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">request{declined.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !withdrawals || withdrawals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Banknote className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">No withdrawal requests yet.</p>
          <p className="text-xs text-center">Once you make a withdrawal request, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(withdrawals as any[]).map((w: any) => (
            <WithdrawalCard key={w.id} withdrawal={w} userName={userName} />
          ))}
        </div>
      )}
    </div>
  )
}
