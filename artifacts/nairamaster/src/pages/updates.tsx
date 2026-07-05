import { useState } from "react"
import { useGetUpdates, useAddUpdateComment } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import { useLocation } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"

function UpdateItem({ update }: { update: any }) {
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState("")
  const addComment = useAddUpdateComment()
  const queryClient = useQueryClient()

  const handleComment = () => {
    if (!comment.trim()) return
    addComment.mutate({ updateId: update.id, data: { content: comment } }, {
      onSuccess: () => {
        setComment("")
        queryClient.invalidateQueries({ queryKey: ["/api/updates"] })
        toast({ title: "Comment posted!" })
      }
    })
  }

  return (
    <Card className="overflow-hidden hover:border-primary/30 transition-colors">
      <button
        className="w-full text-left p-4 sm:p-5 flex justify-between items-start gap-4 focus:outline-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-[15px] leading-tight text-foreground">{update.title}</h4>
            <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">{formatDate(update.createdAt)}</p>
          </div>
        </div>
        <div className="shrink-0 mt-1">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/50">
          <div className="p-4 sm:p-5 space-y-5">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{update.content}</p>

            <div className="pt-4 border-t border-border/50 space-y-4">
              <h5 className="font-bold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Comments <span className="text-muted-foreground font-normal">({update.comments?.length ?? 0})</span>
              </h5>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {(!update.comments || update.comments.length === 0) && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No comments yet. Be the first to reply!</p>
                )}
                {update.comments?.map((c: any) => (
                  <div key={c.id} className="bg-muted/60 rounded-xl p-3 border border-border/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{c.userName}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground/90">{c.content}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 items-end">
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[44px] h-11 py-2.5 resize-none text-sm"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment() } }}
                />
                <Button
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={handleComment}
                  disabled={!comment.trim() || addComment.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export function Updates() {
  const { data: updates, isLoading } = useGetUpdates()
  const [, setLocation] = useLocation()

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">System Updates</h1>
          <p className="text-muted-foreground text-sm">Latest news and announcements</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !updates || updates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Bell className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">No updates available yet.</p>
          <p className="text-xs text-center">Check back later for platform announcements.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((u: any) => <UpdateItem key={u.id} update={u} />)}
        </div>
      )}
    </div>
  )
}
