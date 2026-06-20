# Project Blueprint

## Overview

This document outlines the structure and plan for a new React application built with Vite and JavaScript.

## Implemented Features

*   **Project Setup:**
    *   React with Vite
    *   JavaScript
    *   Firebase SDK installed
    *   Folder structure created:
        *   `src/components/`
        *   `src/pages/`
        *   `src/services/`
        *   `src/firebase/`
        *   `src/styles/`
*   **Pages:**
    *   `Login.jsx`
    *   `Dashboard.jsx`
*   **Routing:**
    *   `react-router-dom` set up
    *   Routes:
        *   `/` -> Login page
        *   `/dashboard` -> Dashboard page (protected)
        *   `/admin` -> Admin Dashboard (protected)
*   **Authentication & Authorization:**
    *   **Protected Routes:** General routes like `/dashboard` are protected, requiring user authentication.
    *   **Admin Route Protection:**
        *   Implemented `AdminProtectedRoute.jsx` to secure the `/admin` route.
        *   Access is controlled via a Firestore `admins` collection, where each document ID is a user's UID and contains `role: "admin"`.
        *   Unauthenticated users are redirected to `/`.
        *   Authenticated non-admin users are redirected to `/dashboard` with an "Access Denied" message.
*   **Announcement Banner:**
    *   **Admin Dashboard:**
        *   "Announcement Management" section for creating and publishing announcements.
        *   Publishes to Firestore collection `announcements`.
    *   **User Dashboard:**
        *   Displays a visually appealing announcement banner fetched in real-time from Firestore.
*   **User Presence System:**
    *   Refactored from a simple `online` boolean to a more reliable heartbeat-based system.
    *   `lastSeen` is updated every 30 seconds.
    *   Online status in the admin dashboard is now calculated based on the `lastSeen` timestamp.
*   **Sprint 1: Treasure Keys Foundation**
    *   Added `treasureKeys` field to the user object in Firestore.
    *   Dashboard displays the number of treasure keys.
    *   Admin dashboard has a panel to add/reset treasure keys for a user.
*   **Sprint 1.2: Refactor Treasure Keys**
    *   Replaced the single Treasure Keys system with four independent key systems (Bronze, Silver, Gold, Diamond).
    *   Updated the Dashboard and Admin Dashboard to reflect the new data model.
*   **Sprint 2.1: Treasure Vault UI**
    *   Implemented the Treasure Vault UI with navigation from the dashboard.

## Current Plan

### Sprint 2.2: Treasure Vault UI Polish

**Objective:** Improve the Treasure Vault UI.

**Requirements:**

1.  **Back Button:**
    *   Add a "← Back to Dashboard" button.

2.  **Vault Cards:**
    *   Add hover effects (slight scale, enhanced shadow).
    *   Improve the locked status message to show how many more keys are needed.
    *   Add descriptive text to each vault card.

3.  **Header:**
    *   Enhance the header with a "Your Treasure Journey" section.

4.  **Progress Section:**
    *   Improve the progress display with a title and more descriptive text.

5.  **Adherence to existing theme and responsive design.**
