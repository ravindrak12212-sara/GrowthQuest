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
        *   The UI has been refined to match the application's design system, featuring a gradient background, accent border, and improved layout.

## Current Plan

Refactor the user presence system from a simple `online` boolean to a more reliable heartbeat-based system.

**Requirements:**

1.  Keep using the existing Firestore `users` collection.
2.  Continue storing `lastSeen` using `serverTimestamp()`.
3.  Remove all dependency on the `online` field for UI rendering.
4.  After login:
    *   immediately update `lastSeen`
    *   start a heartbeat timer
    *   every 30 seconds update `lastSeen: serverTimestamp()`
5.  When logout occurs:
    *   update `lastSeen`
    *   stop the heartbeat timer
6.  When browser/tab closes:
    *   Use `beforeunload`, `pagehide`, and `visibilitychange` to send one final `lastSeen` update.
7.  In `AdminDashboard.jsx`:
    *   Do NOT read `user.online`.
    *   Instead determine status using: `CurrentTime - lastSeen`
    *   Rules:
        *   `lastSeen` within last 60 seconds -> 🟢 Online
        *   Otherwise -> 🔴 Offline
    *   Display "Last seen: Today 10:42 PM", "Yesterday 8:20 PM", or "dd/mm/yyyy hh:mm AM/PM" using the existing formatting function.

**Keep:**

Do NOT modify:

*   Polls
*   Writing Challenges
*   Wallet
*   Redeem
*   Authentication
*   Admin UI
*   Firestore structure (except for removing dependence on `online`).
