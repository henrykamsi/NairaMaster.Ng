import * as React from "react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { Bell, Home, ListTodo, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const [location] = useLocation()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border flex items-center justify-around px-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.02)] sm:hidden">
      <NavItem href="/" icon={Home} label="Home" active={location === "/"} />
      <NavItem href="/tasks" icon={ListTodo} label="Tasks" active={location === "/tasks" || location.startsWith("/tasks/")} />
      <NavItem href="/settings" icon={Settings} label="Settings" active={location === "/settings"} />
    </div>
  )
}

function NavItem({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors", active && "text-primary")}>
      <Icon className={cn("w-5 h-5", active && "fill-primary/20")} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}

export function TopBar() {
  const { user } = useAuth()
  
  return (
    <div className="sticky top-0 z-40 w-full h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-display font-bold text-lg leading-none">N</span>
        </div>
        <span className="font-display font-bold text-lg tracking-tight">nairamaster.ng</span>
      </div>
      
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-background"></span>
        </Link>
        <Link href="/settings" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase">
          {user?.firstName?.[0] || 'U'}
        </Link>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [location, setLocation] = useLocation()

  React.useEffect(() => {
    if (!token && location !== '/login' && location !== '/register' && location !== '/admin') {
      setLocation('/login')
    }
  }, [token, location, setLocation])

  if (location === '/login' || location === '/register' || location === '/admin') {
    return <>{children}</>
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/30">
      <TopBar />
      
      {/* Desktop Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden sm:flex flex-col w-64 border-r border-border bg-background p-4 gap-2 sticky top-14 h-[calc(100vh-3.5rem)]">
          <Link href="/" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted", location === "/" && "bg-primary text-primary-foreground hover:bg-primary")}>
            <Home className="w-5 h-5" /> Home
          </Link>
          <Link href="/tasks" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted", (location === "/tasks" || location.startsWith("/tasks/")) && "bg-primary text-primary-foreground hover:bg-primary")}>
            <ListTodo className="w-5 h-5" /> Tasks
          </Link>
          <Link href="/settings" className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted mt-auto", location === "/settings" && "bg-primary text-primary-foreground hover:bg-primary")}>
            <Settings className="w-5 h-5" /> Settings
          </Link>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 sm:pb-8">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
      
      <BottomNav />
      
      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/2349118310148" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.48-1.459-1.653-1.756-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>
    </div>
  )
}
