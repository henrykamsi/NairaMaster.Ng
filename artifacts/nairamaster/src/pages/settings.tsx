import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useGetDocs, useGetUpdates, useDeleteMyAccount, useLogout, useAddUpdateComment } from "@workspace/api-client-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Trash2, Mail, FileText, BellRing, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function Settings() {
  const { logout, user } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  
  const { data: docs } = useGetDocs();
  const { data: updates } = useGetUpdates();
  const doLogout = useLogout();
  
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleLogout = () => {
    doLogout.mutate(undefined, {
      onSettled: () => {
        logout();
        setLocation("/login");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-lg flex items-center gap-2 text-primary"><BellRing className="w-5 h-5"/> System Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {(!updates || updates.length === 0) && <p className="text-muted-foreground text-sm text-center py-4">No updates yet.</p>}
          {updates?.map(update => (
            <UpdateItem key={update.id} update={update} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-lg flex items-center gap-2 text-primary"><FileText className="w-5 h-5"/> Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {(!docs || docs.length === 0) && <p className="text-muted-foreground text-sm text-center py-4">No documents available.</p>}
          {docs?.map(doc => (
            <DocItem key={doc.id} doc={doc} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-lg text-primary">Preferences & Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Dark Mode</p>
              <p className="text-sm text-muted-foreground">Toggle dark appearance</p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Contact Support</p>
              <p className="text-sm text-muted-foreground">kamsih924@gmail.com</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open('mailto:kamsih924@gmail.com')}>
              <Mail className="w-4 h-4 mr-2" /> Email Us
            </Button>
          </div>

          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <Button variant="secondary" className="w-full justify-start font-semibold text-foreground h-12" onClick={handleLogout}>
              <LogOut className="w-5 h-5 mr-3 text-muted-foreground" /> Sign Out
            </Button>
            <Button variant="destructive" className="w-full justify-start font-semibold h-12" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-5 h-5 mr-3" /> Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground mt-8 pb-8 font-medium">
        All rights reserved — Henry Global Tech Industry 2026
      </div>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} onLogout={() => { logout(); setLocation("/login"); }} />
    </div>
  );
}

function UpdateItem({ update }: { update: any }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const addComment = useAddUpdateComment();
  const queryClient = useQueryClient();

  const handleComment = () => {
    if(!comment.trim()) return;
    addComment.mutate({ updateId: update.id, data: { content: comment } }, {
      onSuccess: () => {
        setComment("");
        queryClient.invalidateQueries({ queryKey: ["/api/updates"] });
      }
    });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden transition-all bg-card hover:border-primary/30">
      <div className="p-4 bg-muted/20 cursor-pointer flex justify-between items-center" onClick={() => setOpen(!open)}>
        <div>
          <h4 className="font-bold text-foreground text-[15px]">{update.title}</h4>
          <p className="text-xs font-semibold text-primary/80 mt-1 uppercase tracking-wider">{formatDate(update.createdAt)}</p>
        </div>
        <div className="bg-background rounded-full p-1 border border-border">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {open && (
        <div className="p-5 space-y-5 border-t border-border/50">
          <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">{update.content}</p>
          <div className="pt-4 border-t border-border/50">
            <h5 className="font-semibold text-sm mb-3">Comments ({update.comments?.length || 0})</h5>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {update.comments?.map((c: any) => (
                <div key={c.id} className="bg-muted/50 p-3 rounded-lg border border-border/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs bg-background px-2 py-1 rounded shadow-sm">{c.userName}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground/90">{c.content}</p>
                </div>
              ))}
              {(!update.comments || update.comments.length === 0) && (
                <p className="text-xs text-muted-foreground italic">No comments yet. Be the first to reply!</p>
              )}
            </div>
            <div className="flex gap-2 items-start mt-2">
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..." className="min-h-[44px] h-11 py-2.5 resize-none bg-muted/20" />
              <Button onClick={handleComment} disabled={!comment.trim() || addComment.isPending} className="h-11 px-6 font-bold shadow-sm">Send</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocItem({ doc }: { doc: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden transition-all bg-card hover:border-primary/30">
      <div className="p-4 bg-muted/20 cursor-pointer flex justify-between items-center" onClick={() => setOpen(!open)}>
        <h4 className="font-bold text-foreground text-[15px]">{doc.title}</h4>
        <div className="bg-background rounded-full p-1 border border-border">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {open && (
        <div className="p-5 space-y-4 border-t border-border/50">
          <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">{doc.content}</p>
          {doc.linkUrl && (
            <a href={doc.linkUrl} target="_blank" rel="noreferrer" className="text-primary text-sm font-bold hover:underline inline-flex items-center gap-1 mt-2 bg-primary/10 px-3 py-1.5 rounded-md">Read Full Document &rarr;</a>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteAccountDialog({ open, onOpenChange, onLogout }: { open: boolean, onOpenChange: (open: boolean) => void, onLogout: () => void }) {
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const deleteAcc = useDeleteMyAccount();

  const handleDel = () => {
    deleteAcc.mutate({ data: { confirmed: true } }, {
      onSuccess: () => {
        toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
        onLogout();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive font-display text-xl">Delete Account</DialogTitle>
          <DialogDescription className="text-base font-medium mt-2 text-foreground/80">
            This action is strictly irreversible. Please confirm the consequences below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-6 bg-destructive/5 -mx-6 px-6 border-y border-destructive/10">
          <label className="flex items-start gap-4 cursor-pointer group">
            <Checkbox checked={c1} onCheckedChange={(c) => setC1(!!c)} className="mt-0.5 group-hover:border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive" />
            <span className="text-sm font-medium leading-tight">I understand that I will <strong className="text-destructive">lose all my pending and approved earnings.</strong></span>
          </label>
          <label className="flex items-start gap-4 cursor-pointer group">
            <Checkbox checked={c2} onCheckedChange={(c) => setC2(!!c)} className="mt-0.5 group-hover:border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive" />
            <span className="text-sm font-medium leading-tight">I understand that all my uploaded tasks and submissions will be permanently deleted.</span>
          </label>
          <label className="flex items-start gap-4 cursor-pointer group">
            <Checkbox checked={c3} onCheckedChange={(c) => setC3(!!c)} className="mt-0.5 group-hover:border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive" />
            <span className="text-sm font-medium leading-tight">I understand this cannot be undone under any circumstances.</span>
          </label>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" className="h-11 font-semibold" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" className="h-11 font-bold shadow-sm" onClick={handleDel} disabled={!c1 || !c2 || !c3 || deleteAcc.isPending}>
            {deleteAcc.isPending ? "Deleting..." : "Permanently Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
