import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useLogin, useRegister } from "@workspace/api-client-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Eye, EyeOff, MessageCircle, KeyRound } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const registerSchema = z.object({
  firstName: z.string().min(2, "At least 2 characters"),
  lastName: z.string().min(2, "At least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  gender: z.enum(["male", "female", "other"]),
  password: z.string().min(6, "At least 6 characters"),
})

export function Login() {
  const [, setLocation] = useLocation()
  const { setAuth } = useAuth()
  const login = useLogin()
  const [showPw, setShowPw] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  function onSubmit(values: z.infer<typeof loginSchema>) {
    login.mutate({ data: values }, {
      onSuccess: (data) => {
        setAuth(data.token, data.user)
        setLocation(data.user.isAdmin ? "/admin" : "/")
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "Invalid email or password."
        toast({ title: "Login failed", description: msg, variant: "destructive" })
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-background">
        <CardHeader className="space-y-3 pb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 shadow-xl shadow-primary/30">
            <span className="font-display font-bold text-3xl leading-none">N</span>
          </div>
          <CardTitle className="text-2xl font-display">Welcome back</CardTitle>
          <CardDescription>Login to your nairamaster.ng account</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" {...field} className="pr-10" />
                      <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end">
                <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold mt-2 shadow-lg shadow-primary/20" disabled={login.isPending}>
                {login.isPending ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Logging in...</span>
                ) : "Login"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button variant="link" className="p-0 h-auto font-bold text-primary" onClick={() => setLocation("/register")}>Sign up free</Button>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <DialogTitle>Forgot Password?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-1">
              Password reset is handled by our admin team. Please reach out on WhatsApp with your registered email address and we'll reset it for you.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <a href="https://wa.me/2349118310148?text=Hello%2C+I+forgot+my+password+for+nairamaster.ng.+My+registered+email+is%3A+" target="_blank" rel="noreferrer" className="block">
              <Button className="w-full h-12 font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white gap-2">
                <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function Register() {
  const [, setLocation] = useLocation()
  const { setAuth } = useAuth()
  const register = useRegister()
  const [showPw, setShowPw] = useState(false)

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", gender: "male", password: "" },
  })

  function onSubmit(values: z.infer<typeof registerSchema>) {
    register.mutate({ data: values }, {
      onSuccess: (data) => {
        setAuth(data.token, data.user)
        setLocation("/")
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "Registration failed. Email might be taken."
        toast({ title: "Registration failed", description: msg, variant: "destructive" })
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30 py-10">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-background">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 shadow-xl shadow-primary/30">
            <span className="font-display font-bold text-3xl leading-none">N</span>
          </div>
          <CardTitle className="text-2xl font-display">Create an account</CardTitle>
          <CardDescription>Join nairamaster.ng and start earning</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input placeholder="John" autoComplete="given-name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input placeholder="Doe" autoComplete="family-name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input placeholder="you@example.com" type="email" autoComplete="email" {...field} /></FormControl>
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
                  <FormControl>
                    <div className="relative">
                      <Input type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="Min. 6 characters" {...field} className="pr-10" />
                      <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-12 text-base font-bold mt-2 shadow-lg shadow-primary/20" disabled={register.isPending}>
                {register.isPending ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Creating account...</span>
                ) : "Create Account"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Button variant="link" className="p-0 h-auto font-bold text-primary" onClick={() => setLocation("/login")}>Login here</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
