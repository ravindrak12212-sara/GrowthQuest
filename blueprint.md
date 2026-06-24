# Project Blueprint

## Overview

This document outlines the structure and plan for the GrowthQuest application, a React-based platform for user engagement and rewards.

## Implemented Features

*   **Project Setup:**
    *   React with Vite
    *   JavaScript
    *   Firebase SDK
    *   Standard project structure (`src/components`, `src/pages`, etc.)
*   **Core Pages & Routing:**
    *   `react-router-dom` for navigation.
    *   Login (`/`)
    *   User Dashboard (`/dashboard`)
    *   Admin Dashboard (`/admin`)
    *   Treasure Vault (`/treasure-vault`)
    *   Delivery Profile (`/delivery-profile`)
*   **Authentication & Authorization:**
    *   **Protected Routes:** User-facing pages require authentication.
    *   **Admin Route Protection:** The `/admin` route is secured via a Firestore `admins` collection, ensuring only authorized users have access.
*   **User Engagement Features:**
    *   **Announcement Banner:** Admins can publish announcements that are displayed in real-time on the user dashboard.
    *   **User Presence System:** A heartbeat system tracks user activity, updating a `lastSeen` timestamp every 30 seconds for reliable online status.
*   **Treasure Keys & Vault System:**
    *   **Multi-Tier Keys:** Users can collect four types of keys: Bronze, Silver, Gold, and Diamond.
    *   **Treasure Vault UI:** A dedicated page (`/treasure-vault`) where users can view their key progress and unlock vaults. The UI includes progress bars, descriptive text, and hover effects.
    *   **Bronze Vault Unlock:** Users can spend 5 Bronze keys to unlock the Bronze Treasure Vault. This creates a `treasureUnlocks` document in Firestore.
*   **Delivery & Rewards:**
    *   **Delivery Profile Page:** A new page at `/delivery-profile` for users to enter their shipping information after unlocking a treasure.
    *   **Post-Unlock Navigation:** After a successful Bronze unlock, the user is automatically redirected to the Delivery Profile page with the unique `unlockId` passed as a URL query parameter (`/delivery-profile?unlockId=<treasureUnlockId>`).
*   **GQ Buddy Support Assistant:**
    *   **User Support Interface:** Floating button (`GQBuddyButton`) and chat console (`GQBuddyChat`) containing interactive quick action buttons (Connect with Admin, FAQs, Rewards Help, Report Issue).
    *   **System Auto-Interception:** Automated welcome initialization and greeting auto-detection (`hi`, `hello`, `hey`) to prevent simple greetings from flooding the Admin queue.
    *   **Admin Support Workspace:** Dedicated panel (`GQBuddyAdmin`) and message view (`GQBuddyAdminChat`) integrated as a tab inside the `AdminDashboard`, supporting pagination, sorting, search, and unread summaries.
    *   **Mobile Responsiveness:** User chat automatically collapses/scales to a full-screen modal on screens under 640px, and the Admin panel shifts to a single-column layout on screens under 768px.
    *   **Dependency-Free Integration:** Standardized on native emojis for all icons (no `lucide-react` dependency).

## Current Plan

### GQ Buddy Assistant Integration
- Completed migration of user and admin chat panels.
- Configured dashboard entries and updated drawer navigation.
- Validated build success.
