"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Settings,
  Shield,
  Key,
  Smartphone,
  Mail,
  Calendar,
  Camera,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Lock,
  Globe,
  Trash2,
  Copy,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { AIChat } from "@/components/chat/ai-chat";
import { AvatarCropModal } from "@/components/dashboard/avatar-crop-modal";

interface ProfileData {
  email: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  is_oauth: boolean;
  has_password: boolean;
  two_factor_enabled: boolean;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface GooglePasswordSetup {
  confirmEmail: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "At least 6 characters", test: (p) => p.length >= 6 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p) => /[0-9]/.test(p) },
  {
    label: "Contains special character (!@#$%^&*)",
    test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
];

function PasswordStrengthIndicator({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword?: string;
}) {
  const results = useMemo(() => {
    return passwordRequirements.map((req) => ({
      ...req,
      passed: req.test(password),
    }));
  }, [password]);

  const passedCount = results.filter((r) => r.passed).length;
  const strengthPercent = (passedCount / passwordRequirements.length) * 100;
  const passwordsMatch =
    confirmPassword !== undefined
      ? password === confirmPassword && password.length > 0
      : null;

  const getStrengthColor = () => {
    if (strengthPercent <= 20) return "bg-red-500";
    if (strengthPercent <= 40) return "bg-orange-500";
    if (strengthPercent <= 60) return "bg-yellow-500";
    if (strengthPercent <= 80) return "bg-lime-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strengthPercent <= 20) return "Very Weak";
    if (strengthPercent <= 40) return "Weak";
    if (strengthPercent <= 60) return "Fair";
    if (strengthPercent <= 80) return "Good";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            Password Strength
          </span>
          <span
            className={`font-medium ${strengthPercent <= 40
              ? "text-red-500"
              : strengthPercent <= 60
                ? "text-yellow-500"
                : "text-green-500"
              }`}
          >
            {getStrengthLabel()}
          </span>
        </div>
        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strengthPercent}%` }}
            transition={{ duration: 0.3 }}
            className={`h-full ${getStrengthColor()} rounded-full`}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-1.5">
        {results.map((req, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-2 text-xs ${req.passed
              ? "text-green-600 dark:text-green-400"
              : "text-neutral-400 dark:text-neutral-500"
              }`}
          >
            {req.passed ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{req.label}</span>
          </motion.div>
        ))}

        {/* Password match indicator */}
        {passwordsMatch !== null && confirmPassword && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-2 text-xs mt-1 ${passwordsMatch
              ? "text-green-600 dark:text-green-400"
              : "text-red-500 dark:text-red-400"
              }`}
          >
            {passwordsMatch ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ProfilePageContent() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "profile");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);

  // Avatar crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [googlePasswordData, setGooglePasswordData] =
    useState<GooglePasswordSetup>({
      confirmEmail: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [notificationIntervals, setNotificationIntervals] = useState<number[]>([
    30, 15, 7, 1,
  ]);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (
      tabFromUrl &&
      ["profile", "security", "settings"].includes(tabFromUrl)
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setMessage({ type: "error", text: "Please type DELETE to confirm" });
      return;
    }

    try {
      setIsDeleting(true);

      const { data: documents } = await supabase
        .from("documents")
        .select("file_path")
        .eq("user_id", user?.id);

      if (documents && documents.length > 0) {
        const filePaths = documents.map((doc) => doc.file_path).filter(Boolean);
        if (filePaths.length > 0) {
          await supabase.storage.from("documents").remove(filePaths);
        }
      }

      await supabase.from("documents").delete().eq("user_id", user?.id);

      if (profileData?.avatar_url) {
        const avatarPath = profileData.avatar_url.split("/").pop();
        if (avatarPath) {
          await supabase.storage
            .from("avatars")
            .remove([`${user?.id}/${avatarPath}`]);
        }
      }

      await supabase.auth.signOut();
      router.push("/?deleted=true");
    } catch (error) {
      console.error("Error deleting account:", error);
      setMessage({
        type: "error",
        text: "Failed to delete account. Please try again.",
      });
      setIsDeleting(false);
    }
  };

  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const identities = user.identities || [];
      const hasGoogleIdentity = identities.some(
        (identity: { provider?: string }) => identity.provider === "google",
      );
      const isOAuth: boolean =
        user.app_metadata?.provider === "google" ||
        user.app_metadata?.providers?.includes("google") ||
        hasGoogleIdentity ||
        false;

      const hasPassword: boolean =
        !isOAuth || !!user.user_metadata?.has_custom_password;

      const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        user.user_metadata?.avatar ||
        identities.find(
          (i: {
            provider?: string;
            identity_data?: { avatar_url?: string; picture?: string };
          }) => i.provider === "google",
        )?.identity_data?.avatar_url ||
        identities.find(
          (i: {
            provider?: string;
            identity_data?: { avatar_url?: string; picture?: string };
          }) => i.provider === "google",
        )?.identity_data?.picture ||
        null;

      const displayName =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.user_name ||
        identities.find(
          (i: {
            provider?: string;
            identity_data?: { name?: string; full_name?: string };
          }) => i.provider === "google",
        )?.identity_data?.name ||
        identities.find(
          (i: {
            provider?: string;
            identity_data?: { name?: string; full_name?: string };
          }) => i.provider === "google",
        )?.identity_data?.full_name ||
        user.email?.split("@")[0] ||
        "";

      const registrationDate = user.created_at || "";

      setProfileData({
        email: user.email || "",
        name: displayName,
        avatar_url: avatarUrl,
        phone: user.user_metadata?.phone || null,
        created_at: registrationDate || user.created_at || "",
        is_oauth: isOAuth,
        has_password: hasPassword,
        two_factor_enabled: user.user_metadata?.two_factor_enabled || false,
      });

      setTwoFactorEnabled(user.user_metadata?.two_factor_enabled || false);
      setEmailNotifications(user.user_metadata?.email_notifications !== false);
      setDesktopNotifications(
        user.user_metadata?.desktop_notifications || false,
      );

      // Load custom notification intervals or use defaults
      if (
        user.user_metadata?.notification_intervals &&
        Array.isArray(user.user_metadata.notification_intervals)
      ) {
        setNotificationIntervals(user.user_metadata.notification_intervals);
      } else {
        setNotificationIntervals([30, 15, 7, 1]);
      }

      if (user.user_metadata?.backup_codes) {
        setBackupCodes(user.user_metadata.backup_codes);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage({ type: "error", text: "Failed to load profile data" });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user) {
      fetchProfileData();
    } else if (!loading && !user) {
      refreshUser().then((freshUser) => {
        if (freshUser) {
          fetchProfileData();
        } else {
          setIsLoading(false);
        }
      });
    }
  }, [loading, user, fetchProfileData, refreshUser]);

  const handleProfileUpdate = async (field: string, value: string) => {
    if (!user) return;

    try {
      setIsSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: { [field]: value },
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully" });
      await refreshUser();
      fetchProfileData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user || !profileData) return;

    // Check all password requirements
    const allRequirementsMet = passwordRequirements.every((req) =>
      req.test(passwordData.newPassword),
    );

    if (!allRequirementsMet) {
      setMessage({
        type: "error",
        text: "Please meet all password requirements",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    try {
      setIsSaving(true);

      if (!profileData.is_oauth) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: passwordData.currentPassword,
        });

        if (signInError) {
          throw new Error("Current password is incorrect");
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      if (profileData.is_oauth) {
        await supabase.auth.updateUser({
          data: { has_custom_password: true },
        });
      }

      setMessage({ type: "success", text: "Password updated successfully" });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      await refreshUser();
      fetchProfileData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGooglePasswordSetup = async () => {
    if (!user || !profileData) return;

    if (
      googlePasswordData.confirmEmail.toLowerCase() !==
      user.email?.toLowerCase()
    ) {
      setMessage({
        type: "error",
        text: "Email confirmation does not match your account",
      });
      return;
    }

    // Check all password requirements
    const allRequirementsMet = passwordRequirements.every((req) =>
      req.test(googlePasswordData.newPassword),
    );

    if (!allRequirementsMet) {
      setMessage({
        type: "error",
        text: "Please meet all password requirements",
      });
      return;
    }

    if (googlePasswordData.newPassword !== googlePasswordData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase.auth.updateUser({
        password: googlePasswordData.newPassword,
      });

      if (error) throw error;

      const { error: metaError } = await supabase.auth.updateUser({
        data: { has_custom_password: true },
      });

      if (metaError) throw metaError;

      setMessage({
        type: "success",
        text: "Password created successfully! You can now sign in with email and password.",
      });

      setGooglePasswordData({
        confirmEmail: "",
        newPassword: "",
        confirmPassword: "",
      });

      await refreshUser();
      await fetchProfileData();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to set password",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateQRCode = async () => {
    try {
      setIsSaving(true);
      setMessage(null);

      const response = await fetch("/api/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate QR code");
      }

      setQrCode(data.qrCode);
      setTotpSecret(data.secret);
      setMessage({
        type: "success",
        text: "Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)",
      });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: "error", text: "Please enter a valid 6-digit code" });
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setTwoFactorEnabled(true);
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      setVerificationCode("");
      setQrCode(null);
      setTotpSecret(null);
      setMessage({
        type: "success",
        text: "Two-factor authentication enabled successfully! Save your backup codes.",
      });

      await refreshUser();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setIsSaving(true);

      const response = await fetch("/api/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to disable 2FA");
      }

      setTwoFactorEnabled(false);
      setQrCode(null);
      setBackupCodes([]);
      setShowBackupCodes(false);
      setMessage({
        type: "success",
        text: "Two-factor authentication disabled",
      });

      await refreshUser();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setMessage({ type: "success", text: "Backup codes copied to clipboard" });
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (max 10MB for cropping)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 10MB" });
      return;
    }

    setSelectedImageFile(file);
    setShowCropModal(true);

    // Reset input so the same file can be selected again
    event.target.value = "";
  };

  const handleCroppedAvatar = async (croppedBlob: Blob) => {
    try {
      setIsSaving(true);
      setShowCropModal(false);

      const fileName = `${user?.id}-${Date.now()}.jpg`;

      // Upload the cropped image
      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (error) {
        if (
          error.message.includes("Bucket not found") ||
          error.message.includes("bucket")
        ) {
          throw new Error(
            "Avatar storage is not configured. Please create an 'avatars' bucket in your Supabase Storage with public access enabled.",
          );
        }
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      // Add cache buster to force refresh
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update profile in database
      await supabase.auth.updateUser({
        data: { avatar_url: urlWithCacheBuster },
      });

      // Update local state immediately for instant feedback
      setProfileData((prev) =>
        prev ? { ...prev, avatar_url: urlWithCacheBuster } : null,
      );

      // Refresh user context
      await refreshUser();

      setMessage({ type: "success", text: "Avatar updated successfully!" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
      setSelectedImageFile(null);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen bg-transparent">
        <Sidebar />
        <div className="flex-1 md:ml-16">
          <Header user={user} sidebarCollapsed={true} />
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-[#A8BBA3]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />

      <div className="flex-1 md:ml-16">
        <Header user={user} sidebarCollapsed={true} />

        <main className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-[#A8BBA3]/10 dark:bg-[#A8BBA3]/20">
                <User className="h-6 w-6 text-[#A8BBA3]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  Account Management
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Configure your profile, security settings, and application
                  preferences
                </p>
              </div>
            </div>
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-lg border ${message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                }`}
            >
              <div className="flex items-center gap-2">
                {message.type === "success" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {message.text}
              </div>
            </motion.div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Manage your profile details and avatar settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {profileData?.avatar_url ? (
                        <img
                          src={profileData.avatar_url}
                          alt="Profile"
                          className="h-20 w-20 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-linear-to-tr from-[#A8BBA3] to-[#8FA58F] flex items-center justify-center text-white text-xl font-bold">
                          {profileData?.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <label className="absolute -bottom-1 -right-1 p-1.5 bg-white dark:bg-neutral-900 rounded-full border-2 border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <Camera className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarSelect}
                          disabled={isSaving}
                        />
                      </label>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium text-neutral-900 dark:text-white">
                        Profile Avatar
                      </h3>
                      <p className="text-sm text-neutral-500">
                        Upload a professional profile image
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={profileData?.name || ""}
                      onChange={(e) =>
                        handleProfileUpdate("name", e.target.value)
                      }
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="email"
                        value={profileData?.email || ""}
                        disabled
                        className="flex-1"
                      />
                      {profileData?.is_oauth && (
                        <Badge variant="secondary" className="shrink-0">
                          Google
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">
                      Email cannot be changed. Contact support if needed.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-linear-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800/30 dark:to-neutral-800/50 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-neutral-500" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          Authentication
                        </p>
                        <p className="text-xs text-neutral-500">
                          {profileData?.is_oauth
                            ? "Google OAuth Integration"
                            : "Email & Password"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-neutral-500" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          Registration Date
                        </p>
                        <p className="text-xs text-neutral-500">
                          {profileData?.created_at
                            ? new Date(
                              profileData.created_at,
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                            : user?.created_at
                              ? new Date(user.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )
                              : "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                      <Key className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    Password Management
                  </CardTitle>
                  <CardDescription>
                    {profileData?.is_oauth && !profileData?.has_password
                      ? "Establish password credentials for enhanced security"
                      : "Update your authentication credentials"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileData?.is_oauth && !profileData?.has_password ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900 dark:text-blue-400">
                            Establish Password Authentication
                          </span>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Verify your Google account email and create secure
                          password credentials for dual authentication access.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmEmail">
                          Verify Account Email
                        </Label>
                        <Input
                          id="confirmEmail"
                          type="email"
                          value={googlePasswordData.confirmEmail}
                          onChange={(e) =>
                            setGooglePasswordData((prev) => ({
                              ...prev,
                              confirmEmail: e.target.value,
                            }))
                          }
                          placeholder="Enter your registered email address"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newGooglePassword">
                          Create Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="newGooglePassword"
                            type={showPasswords.new ? "text" : "password"}
                            value={googlePasswordData.newPassword}
                            onChange={(e) =>
                              setGooglePasswordData((prev) => ({
                                ...prev,
                                newPassword: e.target.value,
                              }))
                            }
                            placeholder="Enter a secure password"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((prev) => ({
                                ...prev,
                                new: !prev.new,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            {showPasswords.new ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <PasswordStrengthIndicator
                          password={googlePasswordData.newPassword}
                          confirmPassword={googlePasswordData.confirmPassword}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmGooglePassword">
                          Verify Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmGooglePassword"
                            type={showPasswords.confirm ? "text" : "password"}
                            value={googlePasswordData.confirmPassword}
                            onChange={(e) =>
                              setGooglePasswordData((prev) => ({
                                ...prev,
                                confirmPassword: e.target.value,
                              }))
                            }
                            placeholder="Re-enter your password"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((prev) => ({
                                ...prev,
                                confirm: !prev.confirm,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            {showPasswords.confirm ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        onClick={handleGooglePasswordSetup}
                        disabled={
                          isSaving ||
                          !googlePasswordData.confirmEmail ||
                          !googlePasswordData.newPassword ||
                          !googlePasswordData.confirmPassword
                        }
                        className="w-full"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Setting up...
                          </>
                        ) : (
                          "Establish Password"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!profileData?.is_oauth && (
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">
                            Current Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showPasswords.current ? "text" : "password"}
                              value={passwordData.currentPassword}
                              onChange={(e) =>
                                setPasswordData((prev) => ({
                                  ...prev,
                                  currentPassword: e.target.value,
                                }))
                              }
                              placeholder="Enter your current password"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowPasswords((prev) => ({
                                  ...prev,
                                  current: !prev.current,
                                }))
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                            >
                              {showPasswords.current ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData((prev) => ({
                                ...prev,
                                newPassword: e.target.value,
                              }))
                            }
                            placeholder="Enter a secure password"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((prev) => ({
                                ...prev,
                                new: !prev.new,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            {showPasswords.new ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <PasswordStrengthIndicator
                          password={passwordData.newPassword}
                          confirmPassword={passwordData.confirmPassword}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmNewPassword">
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmNewPassword"
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData((prev) => ({
                                ...prev,
                                confirmPassword: e.target.value,
                              }))
                            }
                            placeholder="Re-enter your new password"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((prev) => ({
                                ...prev,
                                confirm: !prev.confirm,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            {showPasswords.confirm ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        onClick={handlePasswordChange}
                        disabled={
                          isSaving ||
                          (!profileData?.is_oauth &&
                            !passwordData.currentPassword) ||
                          !passwordData.newPassword ||
                          !passwordData.confirmPassword
                        }
                        className="w-full"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Updating...
                          </>
                        ) : (
                          "Change Password"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                      <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Enhance account security with multi-factor authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        Multi-Factor Authentication
                      </p>
                      <p className="text-sm text-neutral-500">
                        {twoFactorEnabled
                          ? "Advanced security protection is enabled"
                          : "Strengthen account security with 2FA"}
                      </p>
                    </div>
                    <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
                      {twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  {!twoFactorEnabled && !qrCode && (
                    <Button
                      onClick={handleGenerateQRCode}
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Enable Two-Factor Authentication
                        </>
                      )}
                    </Button>
                  )}

                  {qrCode && !twoFactorEnabled && (
                    <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <div className="text-center space-y-4">
                        <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                          <img
                            src={qrCode}
                            alt="2FA QR Code"
                            className="h-48 w-48"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Scan with Google Authenticator, Authy, or similar
                            app
                          </p>
                          {totpSecret && (
                            <div className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded text-xs font-mono break-all">
                              <span className="text-neutral-500">
                                Manual entry:{" "}
                              </span>
                              {totpSecret}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="verificationCode">
                          Enter 6-digit code from your app
                        </Label>
                        <Input
                          id="verificationCode"
                          value={verificationCode}
                          onChange={(e) =>
                            setVerificationCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="000000"
                          maxLength={6}
                          className="text-center text-2xl tracking-widest font-mono"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setQrCode(null);
                            setTotpSecret(null);
                            setVerificationCode("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleVerify2FA}
                          disabled={isSaving || verificationCode.length !== 6}
                          className="flex-1"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Verifying...
                            </>
                          ) : (
                            "Verify & Enable"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {twoFactorEnabled && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900 dark:text-green-400">
                            Two-factor authentication is active
                          </span>
                        </div>
                      </div>

                      {backupCodes.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-neutral-900 dark:text-white">
                              Backup Codes
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setShowBackupCodes(!showBackupCodes)
                              }
                            >
                              {showBackupCodes ? "Hide" : "Show"}
                            </Button>
                          </div>

                          {showBackupCodes && (
                            <div className="space-y-2">
                              <p className="text-sm text-neutral-500">
                                Save these codes securely. Each can only be used
                                once.
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {backupCodes.map((code, index) => (
                                  <code
                                    key={index}
                                    className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-sm font-mono text-center"
                                  >
                                    {code}
                                  </code>
                                ))}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={copyBackupCodes}
                                className="w-full"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy All Codes
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      <Button
                        variant="destructive"
                        onClick={handleDisable2FA}
                        disabled={isSaving}
                        className="w-full"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Disabling...
                          </>
                        ) : (
                          "Disable Two-Factor Authentication"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                      <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    Application Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your application experience and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        Email Notifications
                      </p>
                      <p className="text-sm text-neutral-500">
                        Receive alerts for document expiration dates
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={async (checked) => {
                        setEmailNotifications(checked);
                        await supabase.auth.updateUser({
                          data: { email_notifications: checked },
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        Desktop Notifications
                      </p>
                      <p className="text-sm text-neutral-500">
                        Display browser notifications for important updates
                      </p>
                    </div>
                    <Switch
                      checked={desktopNotifications}
                      onCheckedChange={async (checked) => {
                        if (checked && "Notification" in window) {
                          const permission =
                            await Notification.requestPermission();
                          if (permission === "granted") {
                            setDesktopNotifications(true);
                            await supabase.auth.updateUser({
                              data: { desktop_notifications: true },
                            });
                          }
                        } else {
                          setDesktopNotifications(false);
                          await supabase.auth.updateUser({
                            data: { desktop_notifications: false },
                          });
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Notification Schedule
                  </CardTitle>
                  <CardDescription>
                    Choose when to receive email reminders before document
                    expiry
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        days: 30,
                        label: "1 Month Before",
                        description: "Advance notice",
                      },
                      {
                        days: 15,
                        label: "15 Days Before",
                        description: "Early reminder",
                      },
                      {
                        days: 7,
                        label: "1 Week Before",
                        description: "Standard reminder",
                      },
                      {
                        days: 1,
                        label: "1 Day Before",
                        description: "Final reminder",
                      },
                    ].map((interval) => (
                      <div
                        key={interval.days}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${notificationIntervals.includes(interval.days)
                          ? "bg-[#A8BBA3]/10 border-[#A8BBA3] dark:bg-[#A8BBA3]/5"
                          : "bg-neutral-50 border-neutral-200 dark:bg-neutral-800/50 dark:border-neutral-700"
                          }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {interval.label}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {interval.description}
                          </p>
                        </div>
                        <Switch
                          checked={notificationIntervals.includes(
                            interval.days,
                          )}
                          onCheckedChange={async (checked) => {
                            let newIntervals: number[];
                            if (checked) {
                              newIntervals = [
                                ...notificationIntervals,
                                interval.days,
                              ].sort((a, b) => b - a);
                            } else {
                              newIntervals = notificationIntervals.filter(
                                (d) => d !== interval.days,
                              );
                            }
                            setNotificationIntervals(newIntervals);
                            await supabase.auth.updateUser({
                              data: { notification_intervals: newIntervals },
                            });
                            setMessage({
                              type: "success",
                              text: checked
                                ? `Added ${interval.label.toLowerCase()} reminder`
                                : `Removed ${interval.label.toLowerCase()} reminder`,
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      <strong>Note:</strong> Reminders are sent daily at 8:00 AM
                      for documents expiring on the selected intervals.
                      {notificationIntervals.length === 0 && (
                        <span className="text-amber-600 dark:text-amber-400 block mt-2">
                          ⚠️ You have disabled all reminders. Enable at least
                          one interval to receive expiry notifications.
                        </span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-red-600 dark:text-red-400">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    Account Termination
                  </CardTitle>
                  <CardDescription>
                    Permanent actions that cannot be undone - proceed with
                    caution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Permanently Delete Account
                  </Button>
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      Warning: This action permanently removes all account data,
                      documents, and settings. This operation cannot be
                      reversed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/40">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-red-900 dark:text-red-100">
                      Delete Account
                    </h2>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <p className="text-neutral-700 dark:text-neutral-300">
                    Are you sure you want to permanently delete your account?
                    This will:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                    <li>Delete all your documents and files</li>
                    <li>Remove all your personal data</li>
                    <li>Cancel any active notifications</li>
                    <li>Permanently close your account</li>
                  </ul>
                </div>

                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <Label
                    htmlFor="deleteConfirm"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Type <span className="font-bold text-red-600">DELETE</span>{" "}
                    to confirm:
                  </Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmText}
                    onChange={(e) =>
                      setDeleteConfirmText(e.target.value.toUpperCase())
                    }
                    placeholder="DELETE"
                    className="mt-2"
                    disabled={isDeleting}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Crop Modal */}
      {selectedImageFile && (
        <AvatarCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setSelectedImageFile(null);
          }}
          imageFile={selectedImageFile}
          onCropComplete={handleCroppedAvatar}
        />
      )}

      <AIChat />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
          <Sidebar />
          <div className="flex-1 md:ml-16">
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-[#A8BBA3]" />
            </div>
          </div>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
