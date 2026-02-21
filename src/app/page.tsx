import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Play, ShieldAlert, FileText, Activity } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 h-16 flex items-center border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-headline font-bold text-xl tracking-tight text-primary">Temporal Vision</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-accent transition-colors" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:text-accent transition-colors" href="/dashboard">
            Dashboard
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-primary">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-headline font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-white">
                  Detect Temporal Video Errors with Precision
                </h1>
                <p className="mx-auto max-w-[700px] text-white/80 md:text-xl font-body">
                  Identify Frame Drops and Frame Merges using advanced motion vector analysis and temporal timestamp verification.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/dashboard">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg rounded-full">
                    Start Analysis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <ShieldAlert className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-bold">Error Detection</h3>
                <p className="text-muted-foreground font-body">
                  Automatically identify Frame Drops (missing frames) and Frame Merges (blended content) in any video stream.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-bold">Motion Analysis</h3>
                <p className="text-muted-foreground font-body">
                  Leverage GenAI to compare motion vectors between consecutive frames for deep temporal consistency checks.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-bold">Detailed Reporting</h3>
                <p className="text-muted-foreground font-body">
                  Generate frame-by-frame classification reports with confidence levels and visual highlighting of inconsistencies.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">© 2024 Temporal Vision Inc. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}