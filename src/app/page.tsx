import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Video, FileText, Zap, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col selection:bg-primary/30">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      {/* Glowing Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -z-10 mix-blend-screen animate-pulse duration-10000" />
      <div className="absolute bottom-1/4 right-1/4 w-120 h-120 bg-indigo-500/10 rounded-full blur-[128px] -z-10 mix-blend-screen animate-pulse duration-7000 delay-1000" />

      {/* Navigation */}
      <nav className="w-full flex items-center justify-between p-6 lg:px-12 z-10 border-b border-border/10 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="bg-primary/20 p-2 rounded-lg text-primary">
            <Video className="w-5 h-5" />
          </div>
          VidToPDF
        </div>
        <div className="flex items-center gap-4">
          <Link href="/convert">
            <Button
              variant="default"
              className="font-semibold rounded-full px-6"
            >
              Start Now
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 py-20 lg:py-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
          <Zap className="w-4 h-4" />
          100% Local Processing &middot; Uncompromising Privacy
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl bg-clip-text text-transparent bg-linear-to-br from-foreground to-foreground/60 mb-6 drop-shadow-sm">
          Convert Your Videos into <br className="hidden md:block" />
          <span className="text-primary bg-clip-text bg-linear-to-br from-primary to-indigo-500">
            High-Quality PDFs
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
          Instantly extract frames from any video and compile them into a
          seamless PDF document. No servers, no uploads, purely in your browser.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/convert">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-semibold rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
            >
              Start Converting
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <a href="#features">
            <Button
              size="lg"
              variant="ghost"
              className="h-14 px-8 text-lg font-medium rounded-full text-muted-foreground hover:text-foreground transition-all"
            >
              Learn More
            </Button>
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="w-full bg-accent/20 border-t border-border/50 py-24 z-10"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Why use VidToPDF?
            </h2>
            <p className="text-muted-foreground text-lg">
              Designed for speed, privacy, and quality.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-background/50 border border-border/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Absolute Privacy</h3>
              <p className="text-muted-foreground">
                Your video never leaves your device. All extraction and
                generation happens locally in your browser.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-background/50 border border-border/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Segmentation</h3>
              <p className="text-muted-foreground">
                Process long videos effortlessly. We split processing into
                manageable 5-minute chunks to save memory.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-background/50 border border-border/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Pristine Quality</h3>
              <p className="text-muted-foreground">
                Generate high-resolution PDFs with perfectly framed screenshots,
                precisely at your chosen interval.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-8 text-sm text-muted-foreground z-10 border-t border-border/10">
        &copy; {new Date().getFullYear()} Video to PDF. All rights reserved.
      </footer>
    </main>
  );
}
