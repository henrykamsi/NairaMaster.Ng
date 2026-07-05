import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useDeleteMyAccount, useLogout } from "@workspace/api-client-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  LogOut, Trash2, Mail, Bell, Download, BellRing, FileText,
  Moon, Sun, ChevronRight, MessageCircle, Smartphone
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "wouter";

async function triggerInstallPrompt(): Promise<boolean> {
  const w = window as any;
  if (w.__nmInstallPrompt) {
    w.__nmInstallPrompt.prompt();
    const { outcome } = await w.__nmInstallPrompt.userChoice;
    w.__nmInstallPrompt = null;
    return outcome === "accepted";
  }
  return false;
}

window.addEventListener("beforeinstallprompt", (e: any) => {
  e.preventDefault();
  (window as any).__nmInstallPrompt = e;
});

export function Settings() {
  const { logout, user } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const doLogout = useLogout();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleLogout = () => {
    doLogout.mutate(undefined, {
      onSettled: () => { logout(); setLocation("/login"); }
    });
  };

  const handleAddToHomeScreen = async () => {
    const accepted = await triggerInstallPrompt();
    if (accepted) {
      toast({ title: "App Installed!", description: "NairaMaster.ng has been added to your home screen." });
    } else {
      // Fallback instructions for iOS / already installed
      toast({
        title: "Add to Home Screen",
        description: "On iOS: tap the Share button then 'Add to Home Screen'. On Android: tap the browser menu then 'Add to Home Screen'.",
      });
    }
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      toast({ title: "Not supported", description: "Your browser does not support push notifications.", variant: "destructive" });
      return;
    }
    if (Notification.permission === "granted") {
      toast({ title: "Already enabled", description: "You are already receiving notifications." });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      toast({ title: "Notifications enabled!", description: "You'll be notified about new tasks and updates." });
    } else {
      toast({ title: "Permission denied", description: "Enable notifications in your browser settings.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl font-display shadow-lg shadow-primary/20">
            {user?.firstName?.[0] ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg leading-tight">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${user?.isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {user?.isAdmin ? "⭐ Administrator" : "Member"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Content sections (navigate to full pages) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-muted-foreground uppercase tracking-wider text-xs font-bold">Content</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2 divide-y divide-border/50">
          <Link href="/updates">
            <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">System Updates</p>
                <p className="text-xs text-muted-foreground">Latest announcements and news</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </Link>
          <Link href="/docs">
            <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Documentation</p>
                <p className="text-xs text-muted-foreground">Guides on how to use NairaMaster</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </Link>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-muted-foreground uppercase tracking-wider text-xs font-bold">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2 divide-y divide-border/50">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Toggle dark appearance</p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
          </div>

          <button
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left"
            onClick={handleEnableNotifications}
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 text-foreground">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Enable Notifications</p>
              <p className="text-xs text-muted-foreground">
                {typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
                  ? "✓ Notifications are enabled"
                  : "Get alerts for new tasks and updates"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left"
            onClick={handleAddToHomeScreen}
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 text-foreground">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Add to Home Screen</p>
              <p className="text-xs text-muted-foreground">Install app for the best experience</p>
            </div>
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-muted-foreground uppercase tracking-wider text-xs font-bold">Support</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2 divide-y divide-border/50">
          <a href="https://wa.me/2349118310148" target="_blank" rel="noreferrer">
            <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">WhatsApp Support</p>
                <p className="text-xs text-muted-foreground">09118310148 — Available daily</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </a>
          <a href="mailto:kamsih924@gmail.com">
            <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Email Support</p>
                <p className="text-xs text-muted-foreground">kamsih924@gmail.com</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </a>
        </CardContent>
      </Card>

      {/* Account actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-muted-foreground uppercase tracking-wider text-xs font-bold">Account</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex flex-col gap-3">
          <Button variant="outline" className="w-full justify-start h-12 font-semibold" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-3 text-muted-foreground" /> Sign Out
          </Button>
          <Button variant="destructive" className="w-full justify-start h-12 font-semibold" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4 mr-3" /> Delete Account
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground pb-4 font-medium">
        All rights reserved — Henry Global Tech Industry 2026
      </p>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} onLogout={() => { logout(); setLocation("/login"); }} />
    </div>
  );
}

function DeleteAccountDialog({ open, onOpenChange, onLogout }: { open: boolean; onOpenChange: (open: boolean) => void; onLogout: () => void }) {
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
          <DialogDescription className="text-sm font-medium mt-1 text-foreground/80">
            This action is strictly irreversible. Please confirm below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 bg-destructive/5 -mx-6 px-6 border-y border-destructive/10">
          {[
            { state: c1, set: setC1, text: "I will lose all my pending and approved earnings." },
            { state: c2, set: setC2, text: "All my uploaded tasks and submissions will be permanently deleted." },
            { state: c3, set: setC3, text: "This cannot be undone under any circumstances." },
          ].map(({ state, set, text }, i) => (
            <label key={i} className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={state} onCheckedChange={(c) => set(!!c)} className="mt-0.5 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive" />
              <span className="text-sm font-medium leading-tight">{text}</span>
            </label>
          ))}
        </div>
        <DialogFooter className="pt-2 gap-2">
          <Button variant="outline" className="h-11 font-semibold" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" className="h-11 font-bold" onClick={handleDel} disabled={!c1 || !c2 || !c3 || deleteAcc.isPending}>
            {deleteAcc.isPending ? "Deleting..." : "Permanently Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
