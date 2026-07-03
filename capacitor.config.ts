import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.decastory.app",
  appName: "DecaStory",
  // Local shell only holds the offline/error fallback page;
  // the real app is loaded from the live deployment below.
  webDir: "capacitor-shell",
  server: {
    url: "https://decastory.vercel.app",
    // Shown if the remote app fails to load (e.g. no connection)
    errorPath: "index.html",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#BFD8EC",
  },
};

export default config;
