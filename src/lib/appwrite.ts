import { Account, Client, Databases, Storage } from "appwrite";

const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const isAppwriteConfigured = Boolean(APPWRITE_PROJECT_ID);

const client = new Client();

client.setEndpoint(APPWRITE_ENDPOINT);

if (APPWRITE_PROJECT_ID) {
  client.setProject(APPWRITE_PROJECT_ID);
} else if (process.env.NODE_ENV !== "production") {
  console.warn(
    "Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID. Set it in your environment to connect to Appwrite.",
  );
}

export const appwriteConfigured = isAppwriteConfigured;

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query } from "appwrite";

export interface DocEntry {
  $id?: string;
  title: string;
  type: "Rent" | "Insurance" | "Subscription" | "License" | "Other";
  expirationDate: string;
  reminderDate: string;
  fileId?: string;
  userId: string;
}
