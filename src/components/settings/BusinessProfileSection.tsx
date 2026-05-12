import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Upload, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { db, storage } from '@/lib/firebase';
import { uploadFile } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import type { BusinessProfile } from '@/types';

interface FormValues {
  name: string;
  address: string;
  email: string;
  phone: string;
}

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function BusinessProfileSection() {
  const { user, userDoc } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<FormValues>({
    defaultValues: { name: '', address: '', email: '', phone: '' },
  });

  // Populate form from userDoc
  useEffect(() => {
    if (!userDoc) return;
    const bp = userDoc.businessProfile;
    reset({
      name: bp?.name ?? '',
      address: bp?.address ?? '',
      email: bp?.email ?? '',
      phone: bp?.phone ?? '',
    });
    setLogoUrl(bp?.logoUrl ?? null);
  }, [userDoc, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const profile: BusinessProfile = {
        name: values.name,
        address: values.address,
        email: values.email,
        phone: values.phone,
        logoUrl: logoUrl,
      };
      await updateDoc(userRef, {
        businessProfile: profile,
        updatedAt: serverTimestamp(),
      });
      toast.success('Business profile saved');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = async (file: File) => {
    if (!user) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error('Logo must be a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Logo must be smaller than 5 MB');
      return;
    }

    setLogoUploading(true);
    try {
      // Remove old logo if it exists
      if (logoUrl) {
        try {
          // Extract path from URL — Storage paths are embedded after /o/ in the URL
          const oldPath = decodeURIComponent(
            logoUrl.split('/o/')[1]?.split('?')[0] ?? ''
          );
          if (oldPath) {
            await deleteObject(ref(storage, oldPath));
          }
        } catch {
          // Ignore deletion errors for old logo
        }
      }

      const path = `users/${user.uid}/business/logo/${file.name}`;
      const { promise } = uploadFile(path, file);
      const url = await promise;
      setLogoUrl(url);

      // Immediately persist the logo URL
      await updateDoc(doc(db, 'users', user.uid), {
        'businessProfile.logoUrl': url,
        updatedAt: serverTimestamp(),
      });
      toast.success('Logo uploaded');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user || !logoUrl) return;
    setLogoUploading(true);
    try {
      try {
        const oldPath = decodeURIComponent(
          logoUrl.split('/o/')[1]?.split('?')[0] ?? ''
        );
        if (oldPath) {
          await deleteObject(ref(storage, oldPath));
        }
      } catch {
        // Ignore
      }
      setLogoUrl(null);
      await updateDoc(doc(db, 'users', user.uid), {
        'businessProfile.logoUrl': null,
        updatedAt: serverTimestamp(),
      });
      toast.success('Logo removed');
    } catch {
      toast.error('Failed to remove logo');
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business Profile</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your business details appear on invoice PDFs
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Logo upload */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/40 hover:bg-muted/70 transition-colors overflow-hidden relative"
                title="Click to upload logo"
              >
                {logoUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Business logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">Upload</span>
                  </div>
                )}
              </button>
              {logoUrl && !logoUploading && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="mt-1 text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5 mx-auto"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>
            <div className="flex-1 text-sm text-muted-foreground pt-2">
              <p>Upload your business logo.</p>
              <p className="text-xs mt-0.5">JPEG, PNG, or WebP · max 5 MB</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoFile(file);
              e.target.value = '';
            }}
          />

          {/* Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bp-name">Business Name</Label>
              <Input id="bp-name" placeholder="Acme Landscaping" {...register('name')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-email">Email</Label>
              <Input id="bp-email" type="email" placeholder="hello@example.com" {...register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-phone">Phone</Label>
              <Input id="bp-phone" placeholder="+1 555 000 0000" {...register('phone')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bp-address">Address</Label>
            <Textarea
              id="bp-address"
              placeholder="123 Main St, Springfield, IL 62701"
              rows={2}
              {...register('address')}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
