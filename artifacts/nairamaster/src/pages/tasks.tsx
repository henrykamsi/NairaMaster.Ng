import * as React from "react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGetTasks, useGetMyTasks, useGetWallet, useCreateTask } from "@workspace/api-client-react"
import { BadgeCheck, User as UserIcon, Check, ImagePlus, Eye, Play, Plus, Clock, Tag, ListTodo } from "lucide-react"
import { formatNaira, cn, formatDate } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

export function Tasks() {
  const { data: tasks, isLoading } = useGetTasks()
  const { data: myTasks } = useGetMyTasks()
  const { data: wallet } = useGetWallet()
  const createMutation = useCreateTask()
  
  const [createOpen, setCreateOpen] = useState(false)
  const [viewTask, setViewTask] = useState<any>(null)
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground uppercase tracking-tight">Master Eng Task</h1>
          <p className="text-muted-foreground text-sm">Perform tasks and earn money.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="font-semibold" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create Task
          </Button>
          <Tabs defaultValue="all" className="w-[180px]">
             {/* We will handle tab state in local component state if we want to switch views */}
          </Tabs>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm mb-6">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="mine">My Tasks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : tasks?.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent"><CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground"><ListTodo className="w-12 h-12 mb-4 opacity-20" /><p>No tasks available right now.</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks?.map(task => (
                <TaskCard key={task.id} task={task} onView={() => setViewTask(task)} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="mine" className="space-y-4">
          {myTasks?.length === 0 ? (
             <Card className="border-dashed border-2 bg-transparent"><CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground"><p>You haven't created any tasks yet.</p><Button className="mt-4" onClick={() => setCreateOpen(true)}>Create One Now</Button></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myTasks?.map(task => (
                <Card key={task.id} className="overflow-hidden">
                  <div className="h-1 bg-secondary w-full" />
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold font-display line-clamp-1 flex-1 pr-4">{task.title}</h3>
                      <div className="bg-muted px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
                        {task.performerCount} / {task.maxPerformers} performed
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{task.description}</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                      <div className="bg-secondary h-full" style={{ width: `${(task.performerCount / task.maxPerformers) * 100}%` }}></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateTaskModal open={createOpen} onOpenChange={setCreateOpen} balance={wallet?.balance || 0} />
      
      <Dialog open={!!viewTask} onOpenChange={(o) => !o && setViewTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              {viewTask?.uploadedByAdmin ? (
                <span className="flex items-center text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md"><BadgeCheck className="w-3 h-3 mr-1" /> System Admin</span>
              ) : (
                <span className="flex items-center text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md"><UserIcon className="w-3 h-3 mr-1" /> User Uploaded</span>
              )}
            </div>
            <DialogTitle className="text-2xl font-display">{viewTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-foreground leading-relaxed">{viewTask?.description}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {viewTask?.tags?.map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-accent/20 text-accent-foreground text-xs font-semibold rounded-full border border-accent/20 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {tag}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 bg-muted/50 p-4 rounded-lg">
              <div><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Platform</p><p className="font-semibold capitalize">{viewTask?.socialMedia}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Action</p><p className="font-semibold capitalize">{viewTask?.category}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Reward</p><p className="font-bold text-primary">{formatNaira(viewTask?.reward || 0)}</p></div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
             <Button className="flex-1" variant="outline" onClick={() => window.open(viewTask?.link, "_blank")} disabled={viewTask?.performedByCurrentUser}><Play className="w-4 h-4 mr-2" /> {viewTask?.performedByCurrentUser ? "Already Performed" : "Perform Task"}</Button>
             <Button className="flex-1" onClick={() => alert('Screenshot upload coming soon')} disabled={viewTask?.performedByCurrentUser}><ImagePlus className="w-4 h-4 mr-2" /> Send Screenshot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TaskCard({ task, onView }: { task: any, onView: () => void }) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:border-primary/30">
      <div className={cn("absolute top-0 left-0 w-1 h-full", task.uploadedByAdmin ? "bg-primary" : "bg-muted-foreground/30")} />
      
      {task.performedByCurrentUser && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="bg-background border border-border px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4 text-success" /> Performed
          </div>
        </div>
      )}

      <CardContent className="p-5 pl-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-2 gap-4">
          <h3 className="font-bold font-display text-lg line-clamp-1">{task.title}</h3>
          {task.uploadedByAdmin ? (
            <div className="shrink-0 bg-primary/10 text-primary p-1.5 rounded-md" title="Uploaded by System Admin"><BadgeCheck className="w-4 h-4" /></div>
          ) : (
             <div className="shrink-0 bg-muted text-muted-foreground p-1.5 rounded-md" title="Uploaded by User"><UserIcon className="w-4 h-4" /></div>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{task.description}</p>
        
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <span className="px-2.5 py-1 bg-muted text-xs font-semibold rounded-md border border-border capitalize">{task.socialMedia}</span>
          <span className="px-2.5 py-1 bg-muted text-xs font-semibold rounded-md border border-border capitalize">{task.category}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <Button variant="secondary" size="sm" className="w-full text-xs h-9 font-semibold" onClick={() => window.open(task.link, "_blank")}><Play className="w-3 h-3 mr-1" /> Perform</Button>
          <Button variant="outline" size="sm" className="w-full text-xs h-9" onClick={onView}><Eye className="w-3 h-3 mr-1" /> View</Button>
          <Button variant="default" size="sm" className="w-full text-xs h-9" onClick={() => alert('upload')}><ImagePlus className="w-3 h-3 mr-1" /> Submit</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateTaskModal({ open, onOpenChange, balance }: { open: boolean, onOpenChange: (open: boolean) => void, balance: number }) {
  const [step, setStep] = useState(1)
  const isMonday = new Date().getDay() === 1
  const fee = isMonday ? 800 : 1000
  
  const [link, setLink] = useState("")
  const [social, setSocial] = useState("")
  const [category, setCategory] = useState("")
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])

  const create = useCreateTask()

  const submit = () => {
    if (balance < fee) {
      toast({ title: "Insufficient Balance", description: `You need ₦${fee} to create a task.`, variant: "destructive" })
      return
    }
    
    create.mutate({ data: { title, description: desc, link, socialMedia: social as any, category: category as any, tags } }, {
      onSuccess: () => {
        toast({ title: "Task created successfully!", description: "It will be visible to 20 users." })
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          {isMonday && step === 1 && (
            <div className="bg-secondary/20 text-secondary-foreground border border-secondary/50 p-3 rounded-lg mt-2 text-sm font-semibold">
              🎉 Monday Promo! Create tasks today for only ₦800 instead of ₦1,000.
            </div>
          )}
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
             <div className="space-y-2">
              <Label>Task Link (URL)</Label>
              <Input placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Social Media Platform</Label>
              <Select onValueChange={setSocial} value={social}>
                <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category (Action)</Label>
              <Select onValueChange={setCategory} value={category}>
                <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="like">Like</SelectItem>
                  <SelectItem value="follow">Follow</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="share">Share</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-4" onClick={() => setStep(2)} disabled={!link || !social || !category}>Next</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input placeholder="e.g. Like my recent post" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description & Instructions</Label>
              <Input placeholder="What exactly should they do?" value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g. fashion" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); if(tagInput) { setTags([...tags, tagInput]); setTagInput(""); }}}} />
                <Button type="button" variant="secondary" onClick={() => { if(tagInput) { setTags([...tags, tagInput]); setTagInput(""); }}}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(t => (
                  <span key={t} className="bg-muted px-2 py-1 rounded text-xs flex items-center gap-1">{t} <button onClick={() => setTags(tags.filter(x => x !== t))} className="text-destructive font-bold">&times;</button></span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={submit} disabled={!title || !desc || create.isPending}>{create.isPending ? "Uploading..." : `Upload (₦${fee})`}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
