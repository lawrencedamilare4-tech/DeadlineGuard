# DeadlineGuard App Context for Agents

This document explains the purpose, architecture, runtime flow, and working assumptions of the DeadlineGuard application so that another agent can understand what the app does and what kinds of changes are safe or expected.

## 1) Purpose of the application

DeadlineGuard is a student-focused Filecoin storage management dashboard. Its purpose is to:

- let students upload assignment files and academic artifacts
- store them on Filecoin via Synapse
- track deadlines and grade stakes
- protect critical files from storage failure or depletion
- monitor Filecoin payment runway, available USDFC balance, and storage health
- recommend archive/protection actions using AI summaries

The product is not a generic file-sharing app. It is built around academic deadlines and assignment protection, with decentralized storage and economics as the core system.

## 2) What the app does at a high level

The user experience is centered around a wallet-connected dashboard:

- connect MetaMask via RainbowKit/Wagmi to a Filecoin Calibration wallet
- check wallet and payments status on-chain
- fund or deposit USDFC for storage payments
- upload a file with assignment metadata (course, assignment title, due date, grade weight)
- save the file record in Supabase with metadata and a PieceCID
- retrieve and preview stored files from Filecoin
- classify files as due soon, overdue, or high stakes
- generate AI summaries for weather/health, alerts, and recommended actions

The app combines blockchain account state, off-chain metadata, and AI summarization to act like an autonomous “storage guardian” for student work.

## 3) Tech stack

This project is a Vite + React app.

Core stack:

- frontend: React 18, Vite, React Router DOM
- styling: Tailwind CSS
- wallet integration: Wagmi + RainbowKit + viem + ethers
- blockchain: Filecoin Calibration network using Synapse SDK
- database/auth: Supabase
- AI: Groq API via OpenAI-compatible chat completions
- animations: Framer Motion
- icons: Lucide React

Main dependencies from package.json:

- @filoz/synapse-core
- @filoz/synapse-sdk
- @rainbow-me/rainbowkit
- @supabase/supabase-js
- @tanstack/react-query
- ethers
- framer-motion
- groq-sdk
- react-router-dom
- viem
- wagmi

## 4) Runtime architecture

### Frontend bootstrapping

The app starts in `src/main.jsx`:

- wraps the app in `WagmiProvider`
- uses `RainbowKitProvider` for wallet UX
- adds `QueryClientProvider` for React Query
- wraps everything in `BrowserRouter`

This makes wallet state available throughout the app and enables route-based navigation.

### App shell and routes

`src/App.jsx` defines the main route structure:

Public routes:

- `/` → LandingPage
- `/login` → LoginPage
- `*` → not found placeholder

Protected routes (wrapped in `ProtectedRoute` and `AppLayout`):

- `/dashboard` → redirects to `/dashboard/overview`
- `/dashboard/overview` → DashboardPage
- `/dashboard/upload` → UploadPage
- `/dashboard/storage` → StoragePage
- `/dashboard/payments` → PaymentsPage
- `/dashboard/forecast` → ForecastPage
- `/dashboard/agent` → AgentActivityPage
- `/dashboard/protected` → ProtectedFilesPage
- `/file/:id` → FileDetailsPage
- `/settings` → SettingsPage

`ProtectedRoute` gates access by checking authentication or wallet/session state.

### Providers and state composition

The app uses two important providers:

- `SupabaseProvider` in `src/hooks/useSupabase.jsx`
  - maintains current Supabase auth user
  - listens to auth state changes
- `FilecoinProvider` in `src/contexts/FilecoinContext.jsx`
  - watches wallet connection state from Wagmi
  - gets payment status from Filecoin
  - initializes Synapse when a wallet is connected
  - exposes wallet balance, deposited balance, available for storage, locked balance, runway, error state, funding state, and helper methods

This means a lot of the app is driven by a single wallet-centered context rather than scattered local state.

## 5) Filecoin and Synapse integration

This is the core business logic of the app.

### Wallet and network

The configured Filecoin network is calibration:

- chain ID: 314159
- network name: Filecoin Calibration
- native gas token: tFIL
- RPC: https://api.calibration.node.glif.io/rpc/v1

The application expects:

- MetaMask wallet
- tFIL to pay gas
- tUSDFC to pay storage costs

### Synapse initialization

`src/services/filecoin/synapseService.js` creates the Synapse client using `@filoz/synapse-sdk`.

Important behavior:

- patches the browser fetch layer to intercept Filecoin RPC requests and route signing requests to MetaMask
- supports `eth_signTypedData_v4` and `eth_sendTransaction` through injected wallet provider
- creates a Synapse instance with the active wallet and Filecoin Calibration chain
- stores a global singleton `synapseInstance`

`initializeSynapse(address, options)` is invoked from the Filecoin context when a wallet becomes connected.

### Payment status

`src/services/filecoin/paymentService.js` reads USDFC payment data directly from the contract:

- wallet USDFC balance
- deposited funds in the Payments contract
- locked funds
- available funds for storage
- basic spend rate and runway estimate

The values are derived from:

- USDFC contract address: 0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0
- Payments contract address: 0x09a0fDc2723fAd1A7b8e3e00eE5DF73841df55a0

These values are the basis for whether a file can be uploaded and how much runway the dashboard shows.

## 6) Upload workflow

The upload flow is the primary user journey.

### Upload form

`src/pages/UploadPage.jsx` collects:

- course name
- assignment title
- due date
- grade weight

This academic metadata is required before the file can be uploaded.

### File upload component

`src/components/file/FileUpload.jsx` is the actual upload UX:

- ensures the user is signed in with Supabase
- ensures the wallet is connected and Synapse is ready
- lets the user select a file
- calls `FilecoinService.uploadFile(...)`
- logs progress and upload state
- persists metadata in Supabase after the Filecoin upload succeeds

### Filecoin upload logic

`src/services/filecoin/storageService.js` handles the storage upload.

Workflow:

1. get current Synapse instance
2. convert file to `Uint8Array`
3. optionally run `prepare()` if user is not already funded
4. build metadata object with:
   - fileName
   - fileSize
   - courseName
   - assignmentTitle
   - dueDate
   - gradeWeight
   - walletAddress
   - source
   - uploadedAt
5. call `synapse.storage.upload(bytes, { onProgress, metadata })`
6. return `pieceCid` and storage summary

This metadata is intentionally embedded with the Filecoin storage record so the app can later correlate files with academic context.

### Persistence in Supabase

After upload, the app inserts into the `files` table with fields like:

- user_id
- wallet_address
- file_name
- file_type
- file_size
- piece_cid
- status
- temperature
- course_name
- assignment_title
- due_date
- grade_weight
- last_modified
- last_accessed

This is the off-chain index that allows the dashboard to show file listings, status filters, deadlines, and retrievals without necessarily querying Filecoin for every listing.

## 7) Storage and retrieval workflow

### Storage page

`src/pages/StoragePage.jsx` loads the user’s files from Supabase by wallet and presents:

- file list
- due date information
- size and grade metadata
- status states
- preview/download actions
- delete functionality
- ability to mark as completed

### Retrieval and preview

The page uses `FilecoinService.retrieveFile(...)` to fetch a blob from Filecoin by PieceCID, then:

- downloads the file as a file
- previews text files by reading blob text
- previews images via object URLs
- previews PDFs by MIME type
- handles unsupported formats gracefully

This allows the app to effectively use decentralized storage as a retrieval backend while keeping a metadata index in Supabase.

### Delete/terminate behavior

When a file is deleted from the app, it removes the Supabase row and then attempts to terminate the Filecoin service for the same PieceCID by calling `storage.terminateService({ pieceCid })` if the Synapse API supports it.

## 8) Dashboard and business logic

`src/pages/DashboardPage.jsx` is the primary “operating room” of the app.

It loads:

- valid files for the connected wallet with PieceCID
- file size totals
- due soon and overdue files
- weather from a custom rules engine
- AI generated insight summary
- a chat experience where the user can ask questions

### Weather engine

`src/engines/weatherEngine.js` calculates a storage condition from inputs like:

- storage utilization
- available balance
- deposited balance
- total files

The result is a weather state like:

- CLEAR
- WATCH
- RAIN
- STORM
- CRITICAL

This weather is used across the UI to visualize storage health and risk.

### AI generated insights

`src/services/ai/groqService.js` calls the Groq API with a prompt assembled from app context.

It supports different tasks:

- `agent_report`
- `chat_response`
- `archive_analysis`
- `weather_explanation`

If no API key exists, it falls back to a local heuristic response. This is important because the app is designed to continue functioning in a limited environment.

Key detail: the Groq system prompt intentionally says the AI must respond in exactly 3 sentences. The app expects concise summaries.

## 9) Protected files and risk prioritization

`src/pages/ProtectedFilesPage.jsx` queries the user’s files and determines which ones are “protected” based on:

- due date within 7 days
- overdue assignments
- high-stakes assignments (grade weight >= 30)
- explicit status = `protected`

This page then:

- sorts files by urgency
- merges data from Filecoin metadata when available
- generates AI recommendations for protected files

This is a core concept in the app: not all storage is equal. Academic files with imminent deadlines or high weight are treated as priority assets.

## 10) Forecasting and runway logic

`src/pages/ForecastPage.jsx` builds a forecast based on:

- current available USDFC balance
- locked funds
- approximate spend rate
- storage size used
- file count

The forecast estimates future runway and produces a 7-day weather-like projection.

Important behavior:

- it reads on-chain payment account details if Synapse is ready
- it uses available balance for runway calculation
- it computes a rough spend rate and compares remaining balance over a 7-day window

This is the core economic monitoring model for the app: show the user how long their storage budget will last and whether conditions are healthy.

## 11) Supabase model and auth assumptions

The app uses Supabase for both auth and metadata storage.

### Auth behavior

`src/hooks/useAuth.jsx` handles wallet-to-user linking:

- fetches current Supabase session
- if no session exists, signs in anonymously
- updates metadata with wallet address
- upserts into `profiles` table

`src/hooks/useSupabase.jsx` is the simpler provider used throughout the app for a general authenticated user context.

### Supabase client

`src/services/supabase/client.js` creates the client using:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

It configures auth persistence and auto-refresh.

## 12) Environment variables and required setup

The project expects environment values set in `.env` or equivalent local environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GROQ_API_KEY`

The README also explains external wallet and chain requirements:

- MetaMask required
- Filecoin Calibration network configured
- tFIL for gas
- tUSDFC for storage payments

The app assumes an injected wallet provider is available (`window.ethereum`) and a connected account has access to a funded Filecoin wallet.

## 13) Critical domain logic to understand before editing

If another agent is making changes, these are the most important application assumptions:

### A. Wallet is the identity anchor

The app uses wallet address as the main key for most storage-related actions. Files are associated with `wallet_address` and often queried by that value in Supabase.

### B. Filecoin is the storage layer; Supabase is the metadata index

The app does not rely solely on Filecoin for browsing. It stores metadata and deadlines in Supabase for quick dashboard queries.

### C. Academic metadata is crucial

Files are not treated as generic binary blobs. The app derives protection logic from:

- due date
- grade weight
- assignment title
- course name

### D. Storage decisions are economics-aware

Upload, retrieval, and dashboard calculations all hinge on available storage balance and payment runway. The app is intentionally designed to warn when funds are low.

### E. Synapse readiness is mandatory for storage operations

Before upload or many filecoin operations, the app expects the wallet and Synapse instance to be initialized. Many pages show or hide features based on `synapseReady`.

## 14) User workflows the app expects

### Scenario 1: New user

1. open landing page
2. connect wallet
3. verify Filecoin Calibration network is set
4. get tFIL and tUSDFC
5. navigate to dashboard
6. check payment status
7. fund wallet if needed
8. upload assignments with academic metadata
9. monitor dashboard for due-soon and weather warnings

### Scenario 2: Existing user with files

1. wallet connects
2. Supabase fetches files by wallet
3. dashboard reads due dates and storage health
4. protected files page highlights urgency
5. storage page allows download/preview/delete
6. forecast page estimates balance runway
7. AI assistant explains state and recommendations

### Scenario 3: Critical failure case

- wallet connected but not enough USDFC available
- upload flow detects insufficient funds
- the UI reports the required amount vs available balance
- user must fund wallet or deposit more USDFC before upload succeeds

## 15) What an agent should do when modifying this app

When working in this repo, preserve these principles:

- do not break the wallet-to-Supabase identity flow
- maintain the distinction between Filecoin data and Supabase metadata
- respect `synapseReady` and wallet-connected guards before upload actions
- keep Filecoin contract addresses and network configuration consistent
- understand that deadlines and grade stakes are part of the product logic, not incidental fields
- if adding new data to upload metadata, make the schema compatible with existing DB expectations
- if changing dashboard behavior, keep AI summary fallback logic working even without Groq API keys

## 16) Main file map

Key files and their roles:

- `src/main.jsx` — app bootstrap and providers
- `src/App.jsx` — routes and protected layout
- `src/contexts/FilecoinContext.jsx` — wallet/payment state
- `src/hooks/useSupabase.jsx` — Supabase user context
- `src/hooks/useAuth.jsx` — wallet auth bridging
- `src/pages/DashboardPage.jsx` — main overview and AI dashboard
- `src/pages/UploadPage.jsx` — academic metadata form
- `src/components/file/FileUpload.jsx` — upload UI and orchestration
- `src/services/filecoin/synapseService.js` — Synapse instance init and wallet RPC patching
- `src/services/filecoin/storageService.js` — uploading to Filecoin
- `src/services/filecoin/paymentService.js` — on-chain funding status
- `src/services/filecoin/index.js` — aggregate Filecoin service export
- `src/services/ai/groqService.js` — AI summary generation
- `src/services/supabase/client.js` — Supabase client
- `src/config/wagmi.js` — wallet chain config
- `src/engines/weatherEngine.js` — storage health/weather logic

## 17) Summary

DeadlineGuard is a wallet-connected academic storage dashboard built on Filecoin Calibration. Its core model is:

- MetaMask wallet proves identity
- Synapse handles Filecoin storage operations
- Supabase stores file metadata and deadlines
- AI uses current storage, balance, and file urgency to summarize conditions
- the app protects academic files by balancing deadline urgency with storage budget health

This makes it a hybrid of decentralized storage app, academic lifecycle manager, and AI monitoring dashboard.

## 18) Practical agent notes

If you are asked to fix, extend, or debug this app, start by checking the following order:

1. wallet connection and Synapse initialization
2. Filecoin balance and available funding checks
3. Supabase file metadata fetch and insert logic
4. dashboard weather and AI summary generation
5. route/auth gating

Most issues in this app will be one of these categories:

- wallet not connected or Synapse not initialized
- insufficient USDFC / insufficient lockup funds
- failed Supabase query or missing auth session
- stale metadata after upload or delete
- AI summarization fallback not working due to missing env key

This document should give a next-step agent enough context to reason about the system without having to reverse-engineer the app from scratch.
