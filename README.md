# DocTracker

**Never miss a document renewal deadline again.** DocTracker is a smart document expiration management system that automatically tracks your important documents and sends timely email reminders before they expire. Built specifically for individuals and businesses who need to stay on top of passport renewals, license expirations, insurance policies, and more.

---

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen)

---

## Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Frontend   | Next.js 16, React 19, TypeScript, Tailwind CSS 4  |
| Backend    | Next.js API Routes, Nodemailer                    |
| Database   | Supabase (PostgreSQL)                             |
| Auth       | Supabase Auth (Email/Password, Google OAuth, 2FA) |
| OCR        | Tesseract.js                                      |
| Animations | Framer Motion                                     |
| DevOps     | Netlify, Netlify Scheduled Functions              |

---

## Key Features

- **Automated Email Reminders** - Receive notifications at 30, 15, 7, and 1 day before document expiration
- **Customizable Notification Schedule** - Configure which reminder intervals work best for you
- **OCR Document Scanning** - Automatically extract text and dates from uploaded document images
- **Secure Document Storage** - Upload and store document copies with Supabase Storage
- **Two-Factor Authentication** - Optional TOTP-based 2FA for enhanced account security
- **Dark Mode Support** - Full light and dark theme with system preference detection
- **Document Analytics** - Visual insights into your document portfolio and expiration trends
- **AI Assistant** - Built-in chat assistant to help with document-related questions

---

## Prerequisites

Before you begin, ensure you have the following:

- Node.js 18 or higher
- npm or yarn package manager
- A [Supabase](https://supabase.com) project
- Gmail account with [App Password](https://support.google.com/accounts/answer/185833) enabled

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/doc-exp-tracker.git
   cd doc-exp-tracker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example environment file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   Required variables:

   | Variable                        | Description                        |
   | ------------------------------- | ---------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL          |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key             |
   | `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key          |
   | `GMAIL_USER`                    | Gmail address for sending emails   |
   | `GMAIL_APP_PASSWORD`            | Gmail App Password (16 characters) |
   | `NEXT_PUBLIC_APP_URL`           | Your application URL               |
   | `CRON_SECRET`                   | Secret key for cron job auth       |

4. **Set up the database**

   Run the SQL scripts in your Supabase SQL Editor:

   ```bash
   # Execute the storage setup script
   supabase-storage-setup.sql
   ```

---

## Usage

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

---

## Project Structure

```
doc-exp-tracker/
|-- public/                     # Static assets
|-- src/
|   |-- app/                    # Next.js App Router
|   |   |-- api/                # API routes
|   |   |   |-- 2fa/            # Two-factor authentication
|   |   |   |-- chat/           # AI chat endpoint
|   |   |   |-- documents/      # Document CRUD operations
|   |   |   |-- notifications/  # Email notification system
|   |   |   |-- ocr/            # OCR processing
|   |   |   +-- welcome/        # Welcome email endpoint
|   |   |-- auth/               # Auth callback handler
|   |   |-- dashboard/          # Protected dashboard pages
|   |   |-- login/              # Login page
|   |   +-- register/           # Registration page
|   |-- components/
|   |   |-- chat/               # AI chat component
|   |   |-- dashboard/          # Dashboard components
|   |   |-- layout/             # Layout components
|   |   |-- providers/          # Context providers
|   |   +-- ui/                 # Reusable UI components
|   |-- hooks/                  # Custom React hooks
|   +-- lib/                    # Utilities and configurations
|       |-- supabase.ts         # Supabase client setup
|       |-- email.ts            # Email utilities
|       |-- ocr.ts              # OCR processing utilities
|       +-- document-actions.ts # Document CRUD functions
|-- supabase/                   # Supabase configuration
|-- .env.example                # Environment variable template
|-- package.json
|-- tsconfig.json
+-- vercel.json                 # Vercel deployment config
```

---

## Notification Schedule

DocTracker sends automated email reminders based on configurable intervals:

| Days Before | Alert Level    | Description                       |
| ----------- | -------------- | --------------------------------- |
| 30 days     | Advance Notice | Early heads-up for planning       |
| 15 days     | Reminder       | Time to start the renewal process |
| 7 days      | Warning        | Renewal becoming urgent           |
| 1 day       | Critical       | Final reminder before expiry      |

Notifications are triggered daily via Vercel cron jobs. Users can customize their preferred intervals in the Settings page.

---

## Deployment

### Netlify (Recommended)

This application is optimized for deployment on Netlify with server-side rendering and scheduled email notifications.

**Quick Start**:

1. Push your code to GitHub
2. Import project in [Netlify](https://app.netlify.com)
3. Configure environment variables
4. Deploy

**Scheduled Notifications**: Automated daily email reminders run at **5:00 AM Nepal Time** via Netlify Scheduled Functions.

📖 **For detailed deployment instructions**, see [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)

### Vercel (Alternative)

The application can also be deployed on Vercel, but requires manual configuration of cron jobs.

### Supabase Setup

Ensure your Supabase project has:

- Row Level Security (RLS) policies for the `documents` table
- Storage buckets for document uploads and user avatars
- Email and Google OAuth authentication providers enabled

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

Please ensure your code follows the existing style and passes linting.

---

## Documentation

For comprehensive information about the project:

- 📘 **[Complete Documentation](./DOCUMENTATION.md)** - Full technical documentation including architecture, API docs, and security
- 🚀 **[Netlify Deployment Guide](./NETLIFY_DEPLOYMENT.md)** - Step-by-step deployment instructions with troubleshooting
- 📋 **[Environment Variables](./env.example)** - Template for required configuration

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database and authentication by [Supabase](https://supabase.com/)
- OCR powered by [Tesseract.js](https://tesseract.projectnaptha.com/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
