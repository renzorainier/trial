// MessagePlayer.js
import in1 from "./in/complete.wav";
import out1 from "./in/all_done.wav";
import successSound from "./success.wav";
import errorSound from "./error.wav";
import alreadyScannedSound from "./alreadyscanned.wav";

// Message arrays
const checkInMessages = [in1];
const checkOutMessages = [in1, out1];

// Utility function to play a sound
const playSound = (sound) => {
  const audio = new Audio(sound);
  audio.play();
};

// Function to play a random message sound
export const playRandomMessageSound = (messages) => {
  const randomIndex = Math.floor(Math.random() * messages.length);
  const randomSound = messages[randomIndex];
  playSound(randomSound);
};

export {
  successSound,
  errorSound,
  alreadyScannedSound,
  checkInMessages,
  checkOutMessages,
  playSound,
};
