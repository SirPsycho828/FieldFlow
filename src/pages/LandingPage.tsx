import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Kanban, Users, FileText, Bell, Menu, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Topographic contour SVG pattern — Terra Firma signature element
function TopoPattern({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="topo-lines" width="300" height="250" patternUnits="userSpaceOnUse">
          <path
            d="M0 60 Q75 30 150 55 T300 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.07"
          />
          <path
            d="M0 90 Q60 65 130 85 T300 80"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            opacity="0.06"
          />
          <path
            d="M0 125 Q90 95 180 120 T300 115"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.07"
          />
          <path
            d="M0 155 Q50 140 120 158 T300 148"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.05"
          />
          <path
            d="M0 185 Q80 160 160 180 T300 178"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.7"
            opacity="0.06"
          />
          <path
            d="M0 215 Q100 195 200 212 T300 208"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.05"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#topo-lines)" />
    </svg>
  );
}

const features = [
  {
    icon: Kanban,
    title: 'Visual Pipeline Board',
    description:
      'Drag-and-drop kanban with six stages that mirror your natural workflow — from first lead through installation and completion. See every client at a glance and know exactly where each project stands.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Users,
    title: 'Complete Client Profiles',
    description:
      'Everything about a client in one place: contact details, project notes, uploaded files, invoices, milestones, and a complete activity timeline. No more hunting through emails and spreadsheets.',
    color: 'bg-terracotta/10 text-terracotta',
  },
  {
    icon: FileText,
    title: 'Professional Invoicing',
    description:
      'Create itemized invoices, generate branded PDFs with your business logo, and track payment status — all without leaving FieldFlow. Your clients see a polished, professional document.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Bell,
    title: 'Needs Attention Alerts',
    description:
      'Automatic notifications surface stale clients and upcoming milestones before they slip through the cracks. Configure your own staleness thresholds to match how you work.',
    color: 'bg-terracotta/10 text-terracotta',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create your account',
    description: 'Sign up with email or Google in under 30 seconds. No credit card, no setup fees.',
  },
  {
    number: '02',
    title: 'Add your clients',
    description: 'Drop your existing leads, consultations, and active projects into the pipeline. Add contact details, notes, and files as you go.',
  },
  {
    number: '03',
    title: 'Watch your pipeline flow',
    description: 'Drag clients between stages as projects progress. FieldFlow keeps your timeline, invoices, and alerts organized automatically.',
  },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Kanban className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold tracking-tight">FieldFlow</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="ghost" size="sm" asChild>
              <a href="#features">Features</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#how-it-works">How It Works</a>
            </Button>
            <div className="ml-2 flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Log In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/login">Get Started</Link>
              </Button>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted/50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-3">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </a>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Log In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background photo with overlay */}
        <div className="absolute inset-0">
          <img
            src="/images/hero-bg.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/75 to-background" />
        </div>
        <TopoPattern className="absolute inset-0 text-foreground pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 sm:py-32 lg:py-40 text-center">
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-tight animate-fade-in-up">
            Your landscape projects,{' '}
            <span className="text-primary">flowing from lead to completion</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            The visual pipeline CRM built exclusively for solo landscape architects.
            Track every client from first contact through installation — no spreadsheets,
            no generic tools, just the workflow you already follow.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <Button size="lg" className="text-base px-8 py-6" asChild>
              <Link to="/login">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 py-6 bg-background/50 backdrop-blur-sm" asChild>
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need, nothing you don't
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Purpose-built for landscape architects who want to spend more time designing
              and less time managing spreadsheets.
            </p>
          </div>

          <div className="flex flex-col gap-20 sm:gap-24">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isReversed = index % 2 === 1;

              return (
                <div
                  key={feature.title}
                  className={`flex flex-col gap-8 items-center ${
                    isReversed ? 'sm:flex-row-reverse' : 'sm:flex-row'
                  }`}
                >
                  {/* Icon / Visual */}
                  <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-card border border-border shadow-sm">
                    <Icon className={`w-10 h-10 sm:w-14 sm:h-14 ${feature.color.split(' ')[1]}`} />
                  </div>

                  {/* Text */}
                  <div className={`flex-1 ${isReversed ? 'sm:text-right' : ''}`}>
                    <h3 className="font-heading text-xl font-bold sm:text-2xl">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-muted-foreground leading-relaxed max-w-lg">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-20 sm:py-28 bg-card border-y border-border">
        <TopoPattern className="absolute inset-0 text-foreground pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              No complex setup, no onboarding calls. Just sign up and start managing your pipeline.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-12">
            {steps.map((step) => (
              <div key={step.number} className="text-center sm:text-left">
                <span className="inline-block font-heading text-4xl font-bold text-primary/20 mb-3">
                  {step.number}
                </span>
                <h3 className="font-heading text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/cta-bg.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background/90" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to bring order to your pipeline?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Join landscape architects who manage their entire client lifecycle
            in one beautiful, purpose-built tool.
          </p>
          <div className="mt-10">
            <Button size="lg" className="text-base px-10 py-6" asChild>
              <Link to="/login">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Free to use. No credit card required.</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Kanban className="h-4 w-4 text-primary" />
            <span className="font-heading text-sm font-bold tracking-tight">FieldFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} FieldFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
