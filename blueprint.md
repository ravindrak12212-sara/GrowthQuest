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

## Current Plan

### Sprint 4 - Milestone 2: Delivery Details Persistence

**Objective:** Implement the functionality to save, retrieve, and display the user's delivery details.

**Tasks:**

1.  **Enable 'Save Details' Button:** The button on the `DeliveryProfile.jsx` page should become active once all form fields are filled.
2.  **Firestore Integration:**
    *   Upon clicking "Save Details", the form data will be saved to the corresponding `treasureUnlocks` document in Firestore.
    *   The `deliveryDetailsSubmitted` field in the `treasureUnlocks` document should be set to `true`.
3.  **Data Retrieval:** When the `DeliveryProfile.jsx` page loads, it should check if delivery details already exist for the given `unlockId` and pre-fill the form if they do.
4.  **Field Validation:** Implement basic client-side validation for the form fields (e.g., required fields, mobile number format, PIN code format).
