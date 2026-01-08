import { supabaseBrowser } from "./supabase-browser";

export const registerUser = async (
  email: string,
  password: string,
  name: string,
) => {
  const { data, error } = await supabaseBrowser.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabaseBrowser.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabaseBrowser.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

export const checkAuth = async () => {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();
  return user;
};

export const deleteCurrentSession = async () => {
  const { error } = await supabaseBrowser.auth.signOut();
  if (error) {
    console.error("Sign out failed:", error.message);
    return false;
  }
  return true;
};

export const logoutUser = async () => {
  const { error } = await supabaseBrowser.auth.signOut();
  if (error) {
    console.error("Logout failed:", error.message);
    return;
  }
  window.location.href = "/login";
};

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabaseBrowser.auth.getUser();

  if (error) {
    console.error("Error getting user:", error.message);
    return null;
  }

  return user;
};

export const onAuthStateChange = (
  callback: (event: string, session: unknown) => void,
) => {
  return supabaseBrowser.auth.onAuthStateChange(callback);
};
