import * as React from "react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { Bell, Home, ListTodo, Settings, Download, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

/* ─── PWA Install Prompt ─── */
let deferredInstallPrompt: any = null;

window.addEventListener("beforeinstallprompt", (e: any) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

function PWAInstallBanner({ onDismiss }: { onDismiss: () => void }) {
  const [installing, setInstalling] = React.useState(false);

  const install = async () => {
    if (!deferredInstallPrompt) return;
    setInstalling(true);
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    setInstalling(false);
    if (outcome === "accepted") {
      toast({ title: "App installed!", description: "NairaMaster.ng has been added to your home screen." });
      onDismiss();
    } else {
      onDismiss();
    }
  };

  return (
    <div className="fixed bottom-[72px] sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <span className="font-display font-bold text-xl leading-none">N</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">Install NairaMaster.ng</p>
          <p className="text-xs text-primary-foreground/80 mt-0.5 leading-tight">Add to your home screen for the best experience</p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="bg-white text-primary hover:bg-white/90 font-bold h-8 text-xs px-3 flex-1"
              onClick={install}
              disabled={installing}
            >
              <Download className="w-3 h-3 mr-1" />
              {installing ? "Installing..." : "Install Now"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs px-2 text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"
              onClick={onDismiss}
            >
              Later
            </Button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-primary-foreground/60 hover:text-primary-foreground transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Notification Permission ─── */
const VAPID_PUBLIC_KEY = "BGg8HLk346rawLX2dgiGU9NLZeug6Kkr0YNBpzAjNr0YNqINf5W_YiOYGAciNA5SjMIVO6nceozyiYafb2VfRlg";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribeUserToPush(token: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await fetch(`${import.meta.env.BASE_URL}api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(sub),
    });
  } catch (err) {
    console.warn("Push subscription failed:", err);
  }
}

function useRegisterSW(token: string | null) {
  React.useEffect(() => {
    if (!token || !("serviceWorker" in navigator)) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
  }, [token]);
}

/* ─── Notification Banner ─── */
function NotificationBanner({ onDismiss, onAllow, token }: { onDismiss: () => void; onAllow: () => void; token: string }) {
  const [loading, setLoading] = React.useState(false);

  const allow = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await subscribeUserToPush(token);
        toast({ title: "Notifications enabled!", description: "You'll be notified about new tasks and updates." });
        onAllow();
      } else {
        onDismiss();
      }
    } catch {
      onDismiss();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-16 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-background border border-border rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Enable Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Get instant alerts when new tasks are posted or your submissions are reviewed.</p>
          </div>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1 h-9 font-bold text-xs" onClick={allow} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Enabling...</span>
            ) : (
              <><CheckCircle2 className="w-3 h-3 mr-1" /> Allow</>
            )}
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-9 text-xs" onClick={onDismiss}>Not now</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bottom Nav ─── */
export function BottomNav() {
  const [location] = useLocation()
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] sm:hidden">
      <NavItem href="/" icon={Home} label="Home" active={location === "/"} />
      <NavItem href="/tasks" icon={ListTodo} label="Tasks" active={location === "/tasks"} />
      <NavItem href="/settings" icon={Settings} label="Settings" active={location === "/settings"} />
    </div>
  )
}

function NavItem({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center justify-center w-full h-full gap-1 transition-colors", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
      <div className={cn("relative p-1.5 rounded-xl transition-colors", active && "bg-primary/10")}>
        <Icon className={cn("w-5 h-5", active && "fill-primary/20")} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className={cn("text-[10px] font-medium", active && "font-bold")}>{label}</span>
    </Link>
  )
}

/* ─── Top Bar ─── */
export function TopBar({ onBellClick }: { onBellClick?: () => void }) {
  const { user } = useAuth()
  return (
    <div className="sticky top-0 z-40 w-full h-14 bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
          <span className="text-primary-foreground font-display font-bold text-lg leading-none">N</span>
        </div>
        <span className="font-display font-bold text-base tracking-tight">nairamaster<span className="text-primary">.ng</span></span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onBellClick}
          className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Enable notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary border-2 border-background animate-pulse" />
        </button>
        <Link href="/settings" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase hover:bg-primary/20 transition-colors">
          {user?.firstName?.[0] ?? "U"}
        </Link>
      </div>
    </div>
  )
}

/* ─── App Shell ─── */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [location, setLocation] = useLocation()

  const [showInstall, setShowInstall] = React.useState(false)
  const [showNotifBanner, setShowNotifBanner] = React.useState(false)
  const [notifDismissed, setNotifDismissed] = React.useState(
    () => localStorage.getItem("nm_notif_dismissed") === "1"
  )
  const [installDismissed, setInstallDismissed] = React.useState(
    () => localStorage.getItem("nm_install_dismissed") === "1"
  )

  const isAuthPage = location === "/login" || location === "/register"
  const isAdminPage = location === "/admin"

  // Register service worker
  useRegisterSW(token)

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!token && !isAuthPage && !isAdminPage) setLocation("/login")
  }, [token, location])

  // Show PWA install prompt after 3s if not dismissed
  React.useEffect(() => {
    if (isAuthPage || installDismissed) return
    const timer = setTimeout(() => {
      if (deferredInstallPrompt) setShowInstall(true)
    }, 3000)
    // Also listen for the event if it fires later
    const handler = () => { if (!installDismissed) setShowInstall(true) }
    window.addEventListener("beforeinstallprompt", handler)
    return () => { clearTimeout(timer); window.removeEventListener("beforeinstallprompt", handler) }
  }, [isAuthPage, installDismissed])

  // Show notification banner after 5s if not dismissed and permission not granted
  React.useEffect(() => {
    if (!token || isAuthPage || notifDismissed) return
    if (!("Notification" in window)) return
    if (Notification.permission === "granted") return
    const timer = setTimeout(() => setShowNotifBanner(true), 5000)
    return () => clearTimeout(timer)
  }, [token, isAuthPage, notifDismissed])

  const dismissInstall = () => {
    setShowInstall(false)
    setInstallDismissed(true)
    localStorage.setItem("nm_install_dismissed", "1")
  }

  const dismissNotif = () => {
    setShowNotifBanner(false)
    setNotifDismissed(true)
    localStorage.setItem("nm_notif_dismissed", "1")
  }

  const allowNotif = () => {
    setShowNotifBanner(false)
    setNotifDismissed(true)
    localStorage.setItem("nm_notif_dismissed", "1")
  }

  if (isAuthPage || isAdminPage) return <>{children}</>

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/30">
      <TopBar onBellClick={() => !notifDismissed && setShowNotifBanner(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden sm:flex flex-col w-60 border-r border-border bg-background p-3 gap-1 sticky top-14 h-[calc(100vh-3.5rem)] shrink-0">
          <SidebarLink href="/" label="Home" icon={Home} active={location === "/"} />
          <SidebarLink href="/tasks" label="Tasks" icon={ListTodo} active={location === "/tasks"} />
          <div className="flex-1" />
          <SidebarLink href="/settings" label="Settings" icon={Settings} active={location === "/settings"} />
        </aside>

        <main className="flex-1 overflow-y-auto pb-20 sm:pb-10">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />

      {/* Floating WhatsApp */}
      <a
        href="https://wa.me/2349118310148"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[72px] sm:bottom-8 right-4 sm:right-8 w-13 h-13 w-[52px] h-[52px] bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform z-40"
        aria-label="Chat on WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.48-1.459-1.653-1.756-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>

      {/* PWA Install Banner */}
      {showInstall && !installDismissed && (
        <PWAInstallBanner onDismiss={dismissInstall} />
      )}

      {/* Notification Permission Banner */}
      {showNotifBanner && !notifDismissed && token && (
        <NotificationBanner onDismiss={dismissNotif} onAllow={allowNotif} token={token} />
      )}
    </div>
  )
}

function SidebarLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </Link>
  )
}
