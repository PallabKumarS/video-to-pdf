import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Video,
  FileText,
  Zap,
  ShieldCheck,
  Upload,
  SlidersHorizontal,
  Download,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col selection:bg-primary/30">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[10%] w-112.5 h-112.5 bg-primary/15 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[-5%] right-[10%] w-95 h-95 bg-violet-500/10 rounded-full blur-[120px] animate-float-delayed" />
        <div className="absolute top-[50%] right-[5%] w-62.5 h-62.5 bg-indigo-400/8 rounded-full blur-[100px] animate-float" />
      </div>

      {/* Navigation */}
      <nav className="w-full flex items-center justify-between p-6 lg:px-12 z-10 border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-xl tracking-tight"
        >
          <div className="bg-primary/15 p-2 rounded-lg text-primary">
            <Video className="w-5 h-5" />
          </div>
          <span>VidToPDF</span>
        </Link>
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
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 py-24 lg:py-36">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
          <Zap className="w-4 h-4" />
          100% Local Processing &middot; Uncompromising Privacy
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6">
          <span className="bg-clip-text text-transparent bg-linear-to-br from-foreground via-foreground/80 to-foreground/50">
            Convert Your Videos
          </span>
          <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-violet-500 to-indigo-400">
            into High-Quality PDFs
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
          Instantly extract frames from any video and compile them into a
          seamless PDF document. No servers, no uploads, purely in your browser.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/convert">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-semibold rounded-full shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.03] transition-all duration-300"
            >
              Start Converting
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <a href="#how-it-works">
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

      {/* How It Works */}
      <section
        id="how-it-works"
        className="w-full py-24 z-10 border-t border-border/30"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Three simple steps to turn any video into a polished PDF.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px bg-border/60" />

            {/* Step 1 */}
            <div className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm group">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-6 z-10 ring-4 ring-background">
                1
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload Video</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Drag and drop or browse to select any video file. Everything
                stays on your device — nothing is uploaded.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm group">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-6 z-10 ring-4 ring-background">
                2
              </div>
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500 mb-5 group-hover:scale-110 transition-transform duration-300">
                <SlidersHorizontal className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Configure & Select</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Set your capture interval, review extracted frames, and select
                exactly which screenshots to include.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm group">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-6 z-10 ring-4 ring-background">
                3
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-5 group-hover:scale-110 transition-transform duration-300">
                <Download className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Download PDF</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your high-resolution PDF is generated instantly in the browser
                and ready to download.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="w-full bg-card/30 border-t border-border/30 py-24 z-10"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Why VidToPDF?
            </h2>
            <p className="text-muted-foreground text-lg">
              Designed for speed, privacy, and quality.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-background/50 border border-border/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Absolute Privacy</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your video never leaves your device. All extraction and
                generation happens locally in your browser.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-background/50 border border-border/40 backdrop-blur-sm hover:border-violet-500/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Video className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Smart Segmentation</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Process long videos effortlessly. We split processing into
                manageable 5-minute chunks to save memory.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-background/50 border border-border/40 backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Pristine Quality</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Generate high-resolution PDFs with perfectly framed screenshots,
                precisely at your chosen interval.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-24 z-10 border-t border-border/30">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to convert your first video?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Get started in seconds — no sign-up required, no uploads, completely
            free and open source.
          </p>
          <Link href="/convert">
            <Button
              size="lg"
              className="h-14 px-10 text-lg font-semibold rounded-full shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.03] transition-all duration-300"
            >
              Start Converting
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-8 text-sm text-muted-foreground z-10 border-t border-border/30">
        &copy; {new Date().getFullYear()} VidToPDF. All rights reserved.
      </footer>
    </main>
  );
}
