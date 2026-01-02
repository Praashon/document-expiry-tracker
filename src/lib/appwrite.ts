import { Account, Client, Databases, Storage } from "appwrite";

const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string);

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
