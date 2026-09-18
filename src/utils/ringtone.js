let audioCtx = null;
let oscillator1 = null;
let oscillator2 = null;
let gainNode = null;
let ringInterval = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const createOscillators = (freq1, freq2) => {
  stopRingtone(); // ensure any existing is stopped
  initAudio();
  
  oscillator1 = audioCtx.createOscillator();
  oscillator2 = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();

  oscillator1.type = 'sine';
  oscillator1.frequency.setValueAtTime(freq1, audioCtx.currentTime);
  
  oscillator2.type = 'sine';
  oscillator2.frequency.setValueAtTime(freq2, audioCtx.currentTime);

  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

  oscillator1.start();
  oscillator2.start();
};

export const playIncomingRingtone = () => {
  try {
    createOscillators(750, 800); // High pitched digital sound
    
    const playPattern = () => {
      const t = audioCtx.currentTime;
      // Rapid 4-beep sequence
      for (let i = 0; i < 4; i++) {
        gainNode.gain.setValueAtTime(0.4, t + (i * 0.2));
        gainNode.gain.setValueAtTime(0, t + (i * 0.2) + 0.1);
      }
    };
    
    playPattern();
    ringInterval = setInterval(playPattern, 2000); // repeat every 2s
  } catch (error) {
    console.warn("Audio play failed:", error);
  }
};

export const playOutgoingRingtone = () => {
  try {
    createOscillators(425, 475); // Lower pitched standard ringback tone
    
    const playPattern = () => {
      const t = audioCtx.currentTime;
      // 2s on, steady dial tone sound
      gainNode.gain.setValueAtTime(0.15, t); // Lower volume for waiting
      gainNode.gain.setValueAtTime(0, t + 2.0);
    };
    
    playPattern();
    ringInterval = setInterval(playPattern, 4000); // repeat every 4s
  } catch (error) {
    console.warn("Audio play failed:", error);
  }
};

export const stopRingtone = () => {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (gainNode && audioCtx) {
    try {
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    } catch (e) {}
  }
  if (oscillator1) {
    try { oscillator1.stop(); oscillator1.disconnect(); } catch(e) {}
    oscillator1 = null;
  }
  if (oscillator2) {
    try { oscillator2.stop(); oscillator2.disconnect(); } catch(e) {}
    oscillator2 = null;
  }
};
