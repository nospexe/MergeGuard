import Topnav from "@/components/layout/Topnav";
import Hero from "@/components/landing/Hero";
import IncidentSection from "@/components/landing/IncidentSection";
import FeatureCards from "@/components/landing/FeatureCards";
import CTAStrip from "@/components/landing/CTAStrip";

export default function Home() {
  return (
    <>
      <Topnav />
      <Hero />
      <IncidentSection />
      <FeatureCards />
      <CTAStrip />
      {/* Footer */}
      <footer className="border-t border-glass-border bg-bg-base px-6 py-8">
        <div className="mx-auto max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-text-1">MergeGuard</span>
            <span className="text-[10px] text-text-3">© 2026</span>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "MIT License", href: "https://github.com/nospexe/MergeGuard/blob/main/LICENSE" },
              { label: "Docs", href: "#" },
              { label: "GitHub", href: "https://github.com/nospexe/MergeGuard" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-[12px] text-text-3 hover:text-text-2 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
