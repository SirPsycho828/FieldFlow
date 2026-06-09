import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Sparkles,
  Briefcase,
  UserPlus,
  PartyPopper,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { createClient } from '@/lib/clients';
import { db } from '@/lib/firebase';
import { STAGES, STAGE_LABELS, SOURCE_OPTIONS } from '@/types';
import type { BusinessProfile } from '@/types';

/* ── Step definitions ───────────────────────────────────── */
const STEPS = ['welcome', 'business-profile', 'first-client', 'done'] as const;
type StepId = typeof STEPS[number];

const STEP_META: Record<StepId, { icon: React.ReactNode; label: string }> = {
  welcome: { icon: <Sparkles className="h-5 w-5" />, label: 'Welcome' },
  'business-profile': { icon: <Briefcase className="h-5 w-5" />, label: 'Business' },
  'first-client': { icon: <UserPlus className="h-5 w-5" />, label: 'First Client' },
  done: { icon: <PartyPopper className="h-5 w-5" />, label: 'Done' },
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completeStep, skipStep, completeWizard } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Business profile form state
  const [bizName, setBizName] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizPhone, setBizPhone] = useState('');

  // First client form state
  const [clientName, setClientName] = useState('');
  const [clientStage, setClientStage] = useState('lead');
  const [clientSource, setClientSource] = useState('');

  const stepId = STEPS[currentStep];

  function goNext() {
    if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
  }

  function goBack() {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  async function handleSkipStep() {
    await skipStep(stepId);
    goNext();
  }

  async function handleSaveBusinessProfile() {
    if (!user) return;
    setSaving(true);
    try {
      const profile: BusinessProfile = {
        name: bizName,
        address: '',
        email: bizEmail,
        phone: bizPhone,
        logoUrl: null,
      };
      await updateDoc(doc(db, 'users', user.uid), {
        businessProfile: profile,
        updatedAt: serverTimestamp(),
      });
      await completeStep('business-profile');
      goNext();
    } catch {
      toast.error('Failed to save business profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateClient() {
    if (!user || !clientName.trim()) return;
    setSaving(true);
    try {
      await createClient(user.uid, {
        name: clientName.trim(),
        stage: clientStage as typeof STAGES[number],
        source: clientSource || null,
      });
      await completeStep('first-client');
      goNext();
    } catch {
      toast.error('Failed to create client');
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    await completeStep('done');
    await completeWizard();
    // Set tour pending flag so it auto-starts on pipeline
    localStorage.setItem('fieldflow-tour-pending', 'true');
    navigate('/pipeline', { replace: true });
  }

  function handleExit() {
    // Mark wizard complete even when exiting early
    completeWizard();
    navigate('/pipeline', { replace: true });
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      {/* Exit button */}
      <button
        onClick={handleExit}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Exit setup"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                i < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : i === currentStep
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  i < currentStep ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-md px-6">
        {/* Welcome */}
        {stepId === 'welcome' && (
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Welcome to FieldFlow
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Let's get your workspace set up in about a minute. We'll create your
              business profile and add your first client to the pipeline.
            </p>
            <div className="pt-2 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-3 justify-center">
                {STEP_META['business-profile'].icon}
                <span>Set up your business profile</span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                {STEP_META['first-client'].icon}
                <span>Add your first client</span>
              </div>
            </div>
            <div className="pt-4">
              <Button onClick={() => { completeStep('welcome'); goNext(); }} className="w-full">
                Let's go <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Business Profile */}
        {stepId === 'business-profile' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <h2 className="font-heading text-xl font-bold tracking-tight">
                Your Business Profile
              </h2>
              <p className="text-sm text-muted-foreground">
                This info appears on invoice PDFs. You can update it later in Settings.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wiz-biz-name">Business Name</Label>
                <Input
                  id="wiz-biz-name"
                  placeholder="Acme Landscaping"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-biz-email">Email</Label>
                  <Input
                    id="wiz-biz-email"
                    type="email"
                    placeholder="hello@example.com"
                    value={bizEmail}
                    onChange={(e) => setBizEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-biz-phone">Phone</Label>
                  <Input
                    id="wiz-biz-phone"
                    placeholder="+1 555 000 0000"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSkipStep}>
                  <SkipForward className="mr-1 h-3.5 w-3.5" /> Skip
                </Button>
                <Button size="sm" onClick={handleSaveBusinessProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save & Continue'}
                  {!saving && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* First Client */}
        {stepId === 'first-client' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <h2 className="font-heading text-xl font-bold tracking-tight">
                Add Your First Client
              </h2>
              <p className="text-sm text-muted-foreground">
                Get your pipeline started with a real client. You can add more anytime.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wiz-client-name">Client Name</Label>
                <Input
                  id="wiz-client-name"
                  placeholder="Sarah Johnson"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-client-stage">Pipeline Stage</Label>
                  <Select value={clientStage} onValueChange={setClientStage}>
                    <SelectTrigger id="wiz-client-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-client-source">Source</Label>
                  <Select value={clientSource} onValueChange={setClientSource}>
                    <SelectTrigger id="wiz-client-source">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSkipStep}>
                  <SkipForward className="mr-1 h-3.5 w-3.5" /> Skip
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateClient}
                  disabled={saving || !clientName.trim()}
                >
                  {saving ? 'Creating...' : 'Create & Continue'}
                  {!saving && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Done */}
        {stepId === 'done' && (
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <PartyPopper className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              You're All Set!
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Your workspace is ready. We'll give you a quick tour of the app next.
            </p>
            <div className="pt-4">
              <Button onClick={handleFinish} className="w-full">
                Start Using FieldFlow <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Step label */}
      <p className="mt-6 text-xs text-muted-foreground">
        Step {currentStep + 1} of {STEPS.length} &middot; {STEP_META[stepId].label}
      </p>
    </div>
  );
}
