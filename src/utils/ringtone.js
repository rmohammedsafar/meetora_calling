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
    createOscillators(400, 450); // UK style ringtone
    
    const playPattern = () => {
      const t = audioCtx.currentTime;
      // 0.4s on
      gainNode.gain.setValueAtTime(0.5, t);
      gainNode.gain.setValueAtTime(0, t + 0.4);
      // 0.2s off, then 0.4s on
      gainNode.gain.setValueAtTime(0.5, t + 0.6);
      gainNode.gain.setValueAtTime(0, t + 1.0);
    };
    
    playPattern();
    ringInterval = setInterval(playPattern, 3000);
  } catch (error) {
    console.warn("Audio play failed:", error);
  }
};

export const playOutgoingRingtone = () => {
  try {
    createOscillators(440, 480); // US style ringback tone
    
    const playPattern = () => {
      const t = audioCtx.currentTime;
      // 2s on
      gainNode.gain.setValueAtTime(0.2, t);
      gainNode.gain.setValueAtTime(0, t + 2.0);
    };
    
    playPattern();
    ringInterval = setInterval(playPattern, 6000);
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
