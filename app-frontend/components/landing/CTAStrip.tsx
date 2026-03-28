"use client";

import Link from "next/link";
import Button from "@/components/shared/Button";
import { ArrowRight, GitFork } from "lucide-react";

export default function CTAStrip() {
  return (
    <section className="relative overflow-hidden bg-bg-base py-24 px-6">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[600px] rounded-full opacity-15"
        style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", filter: "blur(80px)" }}
      />

      <div className="relative z-10 mx-auto max-w-[600px] text-center">
        <h2 className="text-[28px] font-bold tracking-tight text-text-1 mb-4">
          Ready to guard your merges?
        </h2>
        <p className="text-sm text-text-2 mb-8 max-w-md mx-auto">
          MergeGuard is free and open source. Deploy it in under 5 minutes.
          Works with any Git repository.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button variant="primary" size="lg">
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a
            href="https://github.com/nospexe/MergeGuard"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" size="lg">
              <GitFork className="h-4 w-4" />
              Star on GitHub
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
