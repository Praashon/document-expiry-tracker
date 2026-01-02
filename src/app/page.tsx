import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">
          Welcome to Doc Exp Tracker
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Your document expiration tracking solution.
        </p>
      </div>
      <div className="mt-8 flex space-x-4">
        <Link
          href="/login"
          className="px-6 py-3 text-lg font-medium text-neutral-800 bg-[#A8BBA3] rounded-md hover:bg-teal-700"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 text-lg font-medium text-[#A8BBA3] bg-transparent border border-[#A8BBA3] rounded-md hover:bg-teal-50 dark:hover:bg-neutral-800"
        >
          Register
        </Link>
      </div>
    </div>
  );
}
