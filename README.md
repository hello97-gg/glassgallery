
# Glass Gallery

Glass Gallery is a modern, aesthetically pleasing image sharing platform built with a focus on UI/UX, featuring a "glassmorphism" design language. Users can upload images, tag them, select licenses, and explore a community-driven gallery.

## 🌟 Features

-   **Authentication:** Secure login via Google and Apple (powered by Firebase).
-   **Image Upload:** Drag-and-drop uploads with automatic compression and optimization.
-   **Explore:** Discover images by tags, location, or full-text search.
-   **Location Picking:** Interactive map to tag image locations.
-   **User Profiles:** Customizable profiles with header images, bios, and stats.
-   **Social:** Like system, view counters, and social sharing with OG meta tags.
-   **Responsive:** Fully mobile-optimized with a dedicated bottom navigation bar.

## 🛠 Tech Stack

-   **Frontend:** React 19, TypeScript, Vite
-   **Styling:** Tailwind CSS
-   **Backend / Database:** Firebase (Auth, Firestore)
-   **Image Hosting:** Catbox (via API proxy)
-   **Maps:** Leaflet / OpenStreetMap

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+)
-   npm or yarn
-   A Firebase Project

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/glass-gallery.git
    cd glass-gallery
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Credentials**
    Open `services/firebase.ts` and `api/share.js` and replace the placeholder strings (`YOUR_API_KEY`, `YOUR_PROJECT_ID`, etc.) with your actual Firebase project details. You can find these in your Firebase Console under **Project Settings > General > Your apps**.

4.  **Run the development server**
    ```bash
    npm run dev
    ```

## ⚙️ Configuration

### Firebase Setup
1.  Create a project at [firebase.google.com](https://firebase.google.com).
2.  Enable **Authentication** (Google, Apple, or others).
3.  Enable **Firestore Database**.
4.  Copy the web config keys into `services/firebase.ts`.

### Firestore Rules
Ensure your Firestore rules allow read/write for authenticated users. Example:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
