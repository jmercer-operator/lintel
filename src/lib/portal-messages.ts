// Fun, warm messaging library for the client portal
// Each milestone stage has multiple messages that rotate randomly

export const milestoneMessages: Record<string, string[]> = {
  "Planning & Permits": [
    "The blueprints are ready — your home is officially on the map! 📐",
    "Plans are in motion. Every great home starts with a great plan.",
    "The architects have done their thing — your future home is designed and approved!",
  ],
  Demolition: [
    "Out with the old! The site is being prepared for something amazing. 🏗️",
    "Making way for new beginnings — the site is being cleared.",
    "The first step is always the boldest. Demolition is underway!",
  ],
  Foundation: [
    "The foundation is going down — solid ground for your future home. 🧱",
    "Building from the ground up, literally. The foundation is being laid!",
    "Strong foundations make strong homes. Yours is taking shape!",
  ],
  "Frame & Structure": [
    "The skeleton is rising! You'll start to see your home take shape. 🏠",
    "Steel and timber are going up — it's starting to look like a building!",
    "The frame is going up! This is when it gets really exciting.",
  ],
  "Lock Up": [
    "Walls are up, roof is on — it's starting to look like home! 🔑",
    "Your home is now weatherproof. The finishing touches are next!",
    "Lock up stage reached! The outside is done, now for the inside magic.",
  ],
  "Fit Out & Finishes": [
    "The finishing touches are happening — kitchens, bathrooms, the works! ✨",
    "Paint, tiles, fixtures — your home is being brought to life inside!",
    "This is the exciting bit! Your home is getting its personality.",
  ],
  "Completion & Handover": [
    "Almost there! Your new home is nearly ready for you. 🏡",
    "The final checks are happening. Keys are almost in your hands!",
    "Congratulations are almost in order — completion is just around the corner! 🎉",
  ],
};

export const welcomeMessages: string[] = [
  "Your home is taking shape.",
  "Exciting things are happening.",
  "Great things are being built for you.",
  "Your new chapter is unfolding.",
  "Something wonderful is on its way.",
  "Every day, a little closer to home.",
];

export const statusFunMessages: Record<string, string> = {
  Available: "Your lot is reserved and ready.",
  EOI: "Expression of interest noted — you're in the running! 🎯",
  "Under Contract": "Contracts exchanged — you're locked in! 🎉",
  Exchanged: "Everything's signed and sealed. Your home awaits! ✅",
  Settled: "Congratulations! Welcome to your new home! 🏡🎊",
};

export function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getMilestoneMessage(milestoneName: string): string {
  // Try exact match first, then fuzzy match
  const messages = milestoneMessages[milestoneName];
  if (messages) return getRandomMessage(messages);

  // Fuzzy match by checking if milestone name contains a key
  for (const [key, msgs] of Object.entries(milestoneMessages)) {
    if (
      milestoneName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(milestoneName.toLowerCase())
    ) {
      return getRandomMessage(msgs);
    }
  }

  return "Progress is being made on your home! 🏗️";
}
