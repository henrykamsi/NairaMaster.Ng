import { useState } from "react"
import { useGetDocs } from "@workspace/api-client-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { useLocation } from "wouter"

function DocItem({ doc }: { doc: any }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="overflow-hidden hover:border-primary/30 transition-colors">
      <button
        className="w-full text-left p-4 sm:p-5 flex justify-between items-center gap-4 focus:outline-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <span className="font-bold text-[15px] text-foreground line-clamp-1">{doc.title}</span>
        </div>
        <div className="shrink-0">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/50 p-4 sm:p-5 space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{doc.content}</p>
          {doc.linkUrl && (
            <a
              href={doc.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-4 py-2 rounded-lg"
            >
              Read Full Document <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
    </Card>
  )
}

export function Docs() {
  const { data: docs, isLoading } = useGetDocs()
  const [, setLocation] = useLocation()

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Documentation</h1>
          <p className="text-muted-foreground text-sm">Guides and platform rules</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !docs || docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <FileText className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">No documentation available.</p>
          <p className="text-xs text-center">Check back later for guides and instructions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d: any) => <DocItem key={d.id} doc={d} />)}
        </div>
      )}
    </div>
  )
}
