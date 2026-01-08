"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Lock,
  Unlock,
  Building2,
  CreditCard,
  Globe,
  Smartphone,
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
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

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

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Password Management
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

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Messages
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get user metadata and check if OAuth
      const isOAuth = user.app_metadata?.provider === "google";
      const hasPassword = !isOAuth || user.user_metadata?.has_custom_password;

      setProfileData({
        email: user.email || "",
        name: user.user_metadata?.name || user.email?.split("@")[0] || "",
        avatar_url: user.user_metadata?.avatar_url || null,
        phone: user.user_metadata?.phone || null,
        created_at: user.created_at,
        is_oauth: isOAuth,
        has_password: hasPassword,
        two_factor_enabled: user.user_metadata?.two_factor_enabled || false,
      });

      setTwoFactorEnabled(user.user_metadata?.two_factor_enabled || false);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage({ type: "error", text: "Failed to load profile data" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (field: string, value: string) => {
    if (!user) return;

    try {
      setIsSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: { [field]: value },
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully" });
      fetchProfileData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user || !profileData) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      return;
    }

    try {
      setIsSaving(true);

      if (!profileData.is_oauth) {
        // For email/password users, verify current password first
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: passwordData.currentPassword,
        });

        if (signInError) {
          throw new Error("Current password is incorrect");
        }
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      // Update user metadata to indicate they now have a custom password
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
      fetchProfileData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGooglePasswordSetup = async () => {
    if (!user || !profileData) return;

    if (googlePasswordData.confirmEmail !== user.email) {
      setMessage({
        type: "error",
        text: "Email confirmation does not match your account",
      });
      return;
    }

    if (googlePasswordData.newPassword !== googlePasswordData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (googlePasswordData.newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      return;
    }

    try {
      setIsSaving(true);

      // Set password for OAuth user
      const { error } = await supabase.auth.updateUser({
        password: googlePasswordData.newPassword,
        data: { has_custom_password: true },
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Password created successfully! You can now sign in with email and password.",
      });
      setGooglePasswordData({
        confirmEmail: "",
        newPassword: "",
        confirmPassword: "",
      });
      fetchProfileData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    if (!twoFactorEnabled) {
      // Enable 2FA - generate QR code
      try {
        setIsSaving(true);
        // This would typically call your backend to generate TOTP secret and QR code
        // For demo purposes, we'll simulate this
        setQrCode(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        );
        setMessage({
          type: "success",
          text: "Scan the QR code with your authenticator app",
        });
      } catch (error: any) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setIsSaving(false);
      }
    } else {
      // Disable 2FA
      try {
        setIsSaving(true);
        await supabase.auth.updateUser({
          data: { two_factor_enabled: false },
        });
        setTwoFactorEnabled(false);
        setQrCode(null);
        setMessage({
          type: "success",
          text: "Two-factor authentication disabled",
        });
      } catch (error: any) {
        setMessage({ type: "error", text: error.message });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode) return;

    try {
      setIsSaving(true);
      // Verify the code with your backend
      // For demo purposes, we'll simulate this
      if (verificationCode === "123456") {
        await supabase.auth.updateUser({
          data: { two_factor_enabled: true },
        });
        setTwoFactorEnabled(true);
        setBackupCodes(["ABC123", "DEF456", "GHI789", "JKL012", "MNO345"]);
        setMessage({
          type: "success",
          text: "Two-factor authentication enabled successfully",
        });
        setVerificationCode("");
        setQrCode(null);
      } else {
        throw new Error("Invalid verification code");
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);

      // Upload to Supabase storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      // Update user metadata
      await handleProfileUpdate("avatar_url", publicUrl);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar />
        <div className="flex-1 md:ml-72">
          <Header user={user} />
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-[#A8BBA3]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />

      <div className="flex-1 md:ml-72">
        <Header user={user} />

        <main className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
          {/* Page Header */}
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

          {/* Message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-lg border ${
                message.type === "success"
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

            {/* Profile Tab */}
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
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {profileData?.avatar_url ? (
                        <img
                          src={profileData.avatar_url}
                          alt="Profile"
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#A8BBA3] to-[#8FA58F] flex items-center justify-center text-white text-xl font-bold">
                          {profileData?.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <label className="absolute -bottom-1 -right-1 p-1.5 bg-white dark:bg-neutral-900 rounded-full border-2 border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <Camera className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
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

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={profileData?.name || ""}
                      onChange={(e) =>
                        handleProfileUpdate("name", e.target.value)
                      }
                      placeholder="Enter your display name"
                    />
                  </div>

                  {/* Email */}
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

                  {/* Account Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800/30 dark:to-neutral-800/50 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
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
                              ).toLocaleDateString()
                            : "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              {/* Password Management */}
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
                    // Google OAuth user without password
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
                            placeholder="Enter a secure password (minimum 6 characters)"
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
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Establish Password
                      </Button>
                    </div>
                  ) : (
                    // Regular password change
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
                            placeholder="Enter a secure password (minimum 6 characters)"
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
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Change Password
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Two-Factor Authentication */}
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
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={handleTwoFactorToggle}
                      disabled={isSaving}
                      className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    />
                  </div>

                  {qrCode && !twoFactorEnabled && (
                    <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <div className="text-center">
                        <img
                          src={qrCode}
                          alt="2FA QR Code"
                          className="mx-auto h-32 w-32 bg-white p-2 rounded-lg"
                        />
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                          Scan with your preferred authenticator application
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="verificationCode">
                          Verification Code
                        </Label>
                        <Input
                          id="verificationCode"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                        />
                      </div>

                      <Button
                        onClick={handleVerify2FA}
                        disabled={isSaving || verificationCode.length !== 6}
                        className="w-full"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Verify & Enable 2FA
                      </Button>
                    </div>
                  )}

                  {twoFactorEnabled && backupCodes.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-neutral-900 dark:text-white">
                        Backup Codes
                      </p>
                      <p className="text-sm text-neutral-500 mb-2">
                        Save these codes in a safe place. Use them if you lose
                        access to your authenticator app.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((code, index) => (
                          <code
                            key={index}
                            className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-sm font-mono"
                          >
                            {code}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
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
                        Receive professional alerts for document expiration
                        dates
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        Desktop Notifications
                      </p>
                      <p className="text-sm text-neutral-500">
                        Display system notifications for important updates
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        Data Synchronization
                      </p>
                      <p className="text-sm text-neutral-500">
                        Maintain data consistency across all devices
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    />
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
                  <Button variant="destructive" size="sm">
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
    </div>
  );
}
