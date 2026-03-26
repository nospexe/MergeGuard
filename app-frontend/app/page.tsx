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
            {["Privacy", "Terms", "Status", "GitHub"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-[12px] text-text-3 hover:text-text-2 transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
