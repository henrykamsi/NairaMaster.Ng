import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useLogin, useRegister } from "@workspace/api-client-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  gender: z.enum(["male", "female", "other"]),
  password: z.string().min(6),
})

export function Login() {
  const [, setLocation] = useLocation()
  const { setAuth } = useAuth()
  const login = useLogin()

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  })

  function onSubmit(values: z.infer<typeof loginSchema>) {
    login.mutate({ data: values }, {
      onSuccess: (data) => {
        setAuth(data.token, data.user)
        setLocation("/")
      },
      onError: () => {
        toast({ title: "Login failed", description: "Invalid credentials.", variant: "destructive" })
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md border-0 shadow-xl bg-background">
        <CardHeader className="space-y-3 pb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 shadow-lg shadow-primary/20">
            <span className="font-display font-bold text-2xl">N</span>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Login to your nairamaster.ng account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="m@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-12 text-base mt-2" disabled={login.isPending}>
                {login.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button variant="link" className="p-0 h-auto font-semibold" onClick={() => setLocation("/register")}>Sign up</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function Register() {
  const [, setLocation] = useLocation()
  const { setAuth } = useAuth()
  const register = useRegister()
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const passcodeRef = useRef<HTMLInputElement>(null)

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", gender: "male", password: "" }
  })

  function onSubmit(values: z.infer<typeof registerSchema>) {
    register.mutate({ data: values }, {
      onSuccess: (data) => {
        setAuth(data.token, data.user)
        setLocation("/")
      },
      onError: () => {
        toast({ title: "Registration failed", description: "Email might be taken.", variant: "destructive" })
      }
    })
  }

  function handleAdminCheck() {
    if (passcodeRef.current?.value === "3471") {
      setAuth("admin_token", { id: 0, firstName: "Admin", lastName: "", email: "admin@nairamaster.ng", gender: "male", balance: 0, score: 100, status: "active", isAdmin: true, createdAt: new Date().toISOString() })
      setLocation("/admin")
    } else {
      toast({ title: "Invalid passcode", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30 relative">
      {/* Invisible admin dot */}
      <div 
        className="absolute top-4 right-4 w-[10px] h-[10px] opacity-0 cursor-default" 
        onClick={() => setAdminDialogOpen(true)}
      />

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Access</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input ref={passcodeRef} type="password" placeholder="Enter Passcode" />
            <Button onClick={handleAdminCheck} className="w-full mt-4">Access Dashboard</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md border-0 shadow-xl bg-background">
        <CardHeader className="space-y-3 pb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 shadow-lg shadow-primary/20">
            <span className="font-display font-bold text-2xl">N</span>
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join nairamaster.ng to start earning</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input placeholder="John" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="m@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-12 text-base mt-2" disabled={register.isPending}>
                {register.isPending ? "Creating account..." : "Sign up"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Button variant="link" className="p-0 h-auto font-semibold" onClick={() => setLocation("/login")}>Login</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
