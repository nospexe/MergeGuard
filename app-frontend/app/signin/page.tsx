"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Demo mode: accept any credentials
      // In production, this would call Convex Auth signIn
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (rememberMe) {
        localStorage.setItem("mg_session", JSON.stringify({ email, persistent: true }));
      } else {
        sessionStorage.setItem("mg_session", JSON.stringify({ email, persistent: false }));
      }

      router.push("/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d] px-6">
      {/* Background effects */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-15"
        style={{
          background: "radial-gradient(ellipse, rgba(0,212,255,0.2), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)]">
              <Shield className="h-5 w-5 text-[#00d4ff]" />
            </div>
          </Link>
          <h1 className="text-[24px] font-bold font-mono text-[#f8fafc]">
            Welcome back
          </h1>
          <p className="mt-1 text-[13px] text-[rgba(248,250,252,0.45)]">
            Sign in to your MergeGuard account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-[rgba(255,68,68,0.25)] bg-[rgba(255,68,68,0.05)] px-4 py-3 text-[12px] text-[#ff6666]">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="signin-email"
              className="block text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[rgba(248,250,252,0.4)] mb-1.5"
            >
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-[13px] text-[#f8fafc] placeholder:text-[rgba(248,250,252,0.2)] outline-none transition-all focus:border-[rgba(0,212,255,0.4)] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)]"
            />
          </div>

          <div>
            <label
              htmlFor="signin-password"
              className="block text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[rgba(248,250,252,0.4)] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="signin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 pr-10 text-[13px] text-[#f8fafc] placeholder:text-[rgba(248,250,252,0.2)] outline-none transition-all focus:border-[rgba(0,212,255,0.4)] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(248,250,252,0.3)] hover:text-[rgba(248,250,252,0.6)] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.03)] accent-[#00d4ff]"
            />
            <label
              htmlFor="remember-me"
              className="text-[12px] text-[rgba(248,250,252,0.45)] cursor-pointer"
            >
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#00d4ff] py-2.5 text-[13px] font-bold text-[#0a0b0d] transition-all hover:bg-[#00bfe8] hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Sign up link */}
        <p className="mt-6 text-center text-[12px] text-[rgba(248,250,252,0.35)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-[#00d4ff] hover:text-[#00bfe8] transition-colors"
          >
            Sign up
          </Link>
        </p>

        {/* Demo hint */}
        <div className="mt-8 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-center">
          <p className="text-[10px] font-mono text-[rgba(248,250,252,0.3)]">
            Demo mode — any email/password combination works
          </p>
        </div>
      </div>
    </div>
  );
}
