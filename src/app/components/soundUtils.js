// soundUtils.js
import successSoundFile from "./success.wav";
import errorSoundFile from "./error.wav";
import alreadyScannedSoundFile from "./alreadyscanned.wav";
import complete from "./complete.wav";

// Sound files for messages
const checkInMessages = [complete];
const checkOutMessages = [complete];

const preLoadSounds = () => {
  const successSoundRef = new Audio(successSoundFile);
  const errorSoundRef = new Audio(errorSoundFile);
  const alreadyScannedSoundRef = new Audio(alreadyScannedSoundFile);
  const checkInMessageSoundRefs = checkInMessages.map((sound) => new Audio(sound));
  const checkOutMessageSoundRefs = checkOutMessages.map((sound) => new Audio(sound));

  return {
    successSoundRef,
    errorSoundRef,
    alreadyScannedSoundRef,
    checkInMessageSoundRefs,
    checkOutMessageSoundRefs,
  };
};

const playSound = (audioRef) => {
  if (audioRef) {
    audioRef.play();
  }
};

const triggerVisualFeedback = (color, audioRef, setBackgroundColor) => {
  setBackgroundColor(color);
  playSound(audioRef);
  setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
};

const playRandomMessageSound = (messages, audioRefs) => {
  const randomIndex = Math.floor(Math.random() * messages.length);
  const randomSoundRef = audioRefs[randomIndex];
  playSound(randomSoundRef);
};

export {
  preLoadSounds,
  playSound,
  triggerVisualFeedback,
  playRandomMessageSound,
};
