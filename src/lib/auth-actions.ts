import { supabase } from "./supabase";

export const registerUser = async (
  email: string,
  password: string,
  name: string,
) => {
  const { data, error } = await supabase.auth.signUp({
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const checkAuth = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const deleteCurrentSession = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign out failed:", error.message);
    return false;
  }
  return true;
};

export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
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
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting user:", error.message);
    return null;
  }

  return user;
};

export const onAuthStateChange = (
  callback: (event: string, session: unknown) => void,
) => {
  return supabase.auth.onAuthStateChange(callback);
};
