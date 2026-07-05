import { useState } from "react"
import { useGetSubmissions } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BadgeCheck, XCircle, Clock, CheckCircle2, ImagePlus, AlertCircle, ArrowLeft } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { useLocation } from "wouter"

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <CheckCircle2 className="w-3 h-3" /> Approved
    </span>
  )
  if (status === "declined") return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <XCircle className="w-3 h-3" /> Declined
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <Clock className="w-3 h-3" /> Under Review
    </span>
  )
}

function SubmissionCard({ submission, onClick }: { submission: any; onClick: () => void }) {
  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 hover:border-primary/30 group",
        submission.status === "approved" && "border-emerald-200 dark:border-emerald-800/40",
        submission.status === "declined" && "border-red-200 dark:border-red-800/40",
      )}
      onClick={onClick}
    >
      <div className={cn("h-1 w-full",
        submission.status === "approved" && "bg-emerald-500",
        submission.status === "declined" && "bg-red-500",
        submission.status === "pending" && "bg-amber-400",
      )} />
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {submission.task?.title ?? "Task"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
              {submission.task?.socialMedia} · {submission.task?.category}
            </p>
          </div>
          <StatusBadge status={submission.status} />
        </div>

        {submission.status === "declined" && submission.declineReason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg p-3 mb-3 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-400 font-medium">{submission.declineReason}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground font-medium">
            {formatDate(submission.updatedAt)}
          </span>
          <span className="text-xs text-primary font-semibold flex items-center gap-1">
            <ImagePlus className="w-3 h-3" />
            {submission.screenshots?.length ?? 0} screenshot{submission.screenshots?.length !== 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ type }: { type: string }) {
  const icons: Record<string, { icon: JSX.Element; msg: string }> = {
    approved: { icon: <CheckCircle2 className="w-12 h-12 text-emerald-400 opacity-40" />, msg: "No approved submissions yet." },
    declined: { icon: <XCircle className="w-12 h-12 text-red-400 opacity-40" />, msg: "No declined submissions." },
    pending: { icon: <Clock className="w-12 h-12 text-amber-400 opacity-40" />, msg: "No pending submissions." },
    all: { icon: <BadgeCheck className="w-12 h-12 text-primary opacity-20" />, msg: "You haven't performed any tasks yet." },
  }
  const { icon, msg } = icons[type] ?? icons.all
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      {icon}
      <p className="text-sm font-medium">{msg}</p>
    </div>
  )
}

export function Submissions() {
  const { data, isLoading } = useGetSubmissions()
  const [view, setView] = useState<any>(null)
  const [, setLocation] = useLocation()

  const pending = data?.pending ?? []
  const approved = data?.approved ?? []
  const declined = data?.declined ?? []
  const all = [...approved, ...pending, ...declined].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">My Submissions</h1>
          <p className="text-muted-foreground text-sm">Track all your task submission statuses</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-auto p-1 gap-1">
            <TabsTrigger value="all" className="text-xs sm:text-sm py-2">All <span className="ml-1 text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-full">{all.length}</span></TabsTrigger>
            <TabsTrigger value="approved" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Approved</span><span className="sm:hidden">✓</span>
              <span className="ml-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{approved.length}</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Pending</span><span className="sm:hidden">⏳</span>
              <span className="ml-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pending.length}</span>
            </TabsTrigger>
            <TabsTrigger value="declined" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Declined</span><span className="sm:hidden">✗</span>
              <span className="ml-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{declined.length}</span>
            </TabsTrigger>
          </TabsList>

          {([
            { value: "all", items: all },
            { value: "approved", items: approved },
            { value: "pending", items: pending },
            { value: "declined", items: declined },
          ] as const).map(({ value, items }) => (
            <TabsContent key={value} value={value} className="space-y-3 mt-0">
              {items.length === 0 ? <EmptyState type={value} /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((s: any) => <SubmissionCard key={s.id} submission={s} onClick={() => setView(s)} />)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-display">{view?.task?.title ?? "Submission"}</span>
            </DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={view.status} />
                <span className="text-xs text-muted-foreground font-medium">{formatDate(view.updatedAt)}</span>
              </div>

              {view.status === "declined" && view.declineReason && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">Decline Reason</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{view.declineReason}</p>
                  </div>
                </div>
              )}

              {view.task && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform</span>
                    <span className="font-semibold capitalize">{view.task.socialMedia}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Action</span>
                    <span className="font-semibold capitalize">{view.task.category}</span>
                  </div>
                  {view.task.reward > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reward</span>
                      <span className="font-bold text-primary">₦{Number(view.task.reward).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {view.screenshots?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Screenshots ({view.screenshots.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {view.screenshots.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                        <img src={url} alt={`Screenshot ${i + 1}`} className="w-full rounded-lg border border-border object-cover aspect-video hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
