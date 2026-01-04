import { ID, Query } from "appwrite";
import { databases, storage } from "./appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string;
const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID as string;
const COLLECTION_ID_DOCUMENTS = "documents";

type StorageWithBuckets = typeof storage & {
  createBucket?: (bucketId: string, name: string) => Promise<unknown>;
};

type DatabasesWithCollections = typeof databases & {
  createCollection?: (
    databaseId: string,
    collectionId: string,
    name: string,
  ) => Promise<unknown>;
};

const storageWithBuckets = storage as StorageWithBuckets;
const databasesWithCollections = databases as DatabasesWithCollections;

export async function getOrCreateBucket() {
  if (typeof storageWithBuckets.createBucket !== "function") {
    console.warn(
      "Appwrite web SDK does not support createBucket. Create the bucket in the Appwrite console or use the server SDK.",
    );
    return;
  }

  try {
    await storage.getBucket(BUCKET_ID);
    console.log("Bucket already exists");
  } catch (error) {
    try {
      await storageWithBuckets.createBucket(BUCKET_ID, "Documents");
      console.log("Bucket created");
    } catch (error) {
      console.error("Error creating bucket:", error);
    }
  }
}

export async function uploadFile(file: File) {
  try {
    const response = await storage.createFile(BUCKET_ID, ID.unique(), file);
    return response;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

export async function getOrCreateCollection() {
  if (typeof databasesWithCollections.createCollection !== "function") {
    console.warn(
      "Appwrite web SDK does not support createCollection. Create the collection in the Appwrite console or use the server SDK.",
    );
    return;
  }

  try {
    await databases.getCollection(DATABASE_ID, COLLECTION_ID_DOCUMENTS);
    console.log("Collection already exists");
  } catch (error) {
    try {
      await databasesWithCollections.createCollection(
        DATABASE_ID,
        COLLECTION_ID_DOCUMENTS,
        "Documents",
      );
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTION_ID_DOCUMENTS,
        "fileId",
        255,
        true,
      );
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTION_ID_DOCUMENTS,
        "userId",
        255,
        true,
      );
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTION_ID_DOCUMENTS,
        "fileName",
        255,
        true,
      );
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTION_ID_DOCUMENTS,
        "fileType",
        255,
        true,
      );
      await databases.createIntegerAttribute(
        DATABASE_ID,
        COLLECTION_ID_DOCUMENTS,
        "fileSize",
        true,
      );
      console.log("Collection created and attributes added");
    } catch (error) {
      console.error("Error creating collection:", error);
    }
  }
}

export async function addDocument(
  fileId: string,
  userId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
) {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID_DOCUMENTS,
      ID.unique(),
      {
        fileId,
        userId,
        fileName,
        fileType,
        fileSize,
      },
    );
    return response;
  } catch (error) {
    console.error("Error adding document:", error);
    throw error;
  }
}

export async function getDocuments(userId: string) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID_DOCUMENTS,
      [Query.equal("userId", userId)],
    );
    return response.documents;
  } catch (error) {
    console.error("Error getting documents:", error);
    throw error;
  }
}

export async function deleteDocument(documentId: string, fileId: string) {
  try {
    await storage.deleteFile(BUCKET_ID, fileId);
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTION_ID_DOCUMENTS,
      documentId,
    );
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}
