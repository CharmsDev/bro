/**
 * Sound Effects Utility
 * Generates pleasant notification sounds using Web Audio API
 */

class SoundEffects {
  constructor() {
    this.audioContext = null;
  }

  // Initialize audio context (must be called after user interaction)
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play a pleasant "success" chime sound
   * Similar to notification bells - bright and cheerful
   */
  playConfirmationSound() {
    try {
      const ctx = this.initAudioContext();
      const now = ctx.currentTime;

      // Create three notes for a pleasant chime (C major chord arpeggio)
      const notes = [
        { freq: 523.25, time: 0.0, duration: 0.3 },    // C5
        { freq: 659.25, time: 0.1, duration: 0.3 },    // E5
        { freq: 783.99, time: 0.2, duration: 0.4 }     // G5
      ];

      notes.forEach(note => {
        // Create oscillator for the note
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Use sine wave for a pure, bell-like tone
        oscillator.type = 'sine';
        oscillator.frequency.value = note.freq;

        // Envelope: quick attack, gentle decay
        gainNode.gain.setValueAtTime(0, now + note.time);
        gainNode.gain.linearRampToValueAtTime(0.3, now + note.time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);

        // Start and stop
        oscillator.start(now + note.time);
        oscillator.stop(now + note.time + note.duration);
      });

    } catch (error) {
      console.error('Error playing confirmation sound:', error);
    }
  }

  /**
   * Play a subtle "success" tone
   * Shorter and less intrusive
   */
  playSuccessTone() {
    try {
      const ctx = this.initAudioContext();
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 800; // Bright frequency

      // Quick fade in and out
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      oscillator.start(now);
      oscillator.stop(now + 0.15);

    } catch (error) {
      console.error('Error playing success tone:', error);
    }
  }
}

// Singleton instance
let soundEffectsInstance = null;

export function getSoundEffects() {
  if (!soundEffectsInstance) {
    soundEffectsInstance = new SoundEffects();
  }
  return soundEffectsInstance;
}

export default SoundEffects;
