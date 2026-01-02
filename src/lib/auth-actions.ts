import { account, ID } from "./appwrite";

export const registerUser = async (
  email: string,
  password: string,
  name: string,
) => {
  try {
    // Create account
    await account.create(ID.unique(), email, password, name);
    return await account.createEmailPasswordSession(email, password);
  } catch (error: any) {
    throw new Error(error.message || "Registration failed");
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    return await account.createEmailPasswordSession(email, password);
  } catch (error: any) {
    throw new Error(error.message || "Login failed");
  }
};

export const logoutUser = async () => {
  try {
    await account.deleteSession("current");
    window.location.href = "/login";
  } catch (error: any) {
    console.error("Logout failed:", error.message || error);
  }
};
