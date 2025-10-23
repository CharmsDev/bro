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
   * Play a sparkly confirmation sound inspired by Mempool.space
   * Bright, bubbly, and cheerful with multiple overlapping tones
   */
  playConfirmationSound() {
    try {
      const ctx = this.initAudioContext();
      const now = ctx.currentTime;

      // Create multiple overlapping notes for a rich, sparkly effect
      const notes = [
        { freq: 880, time: 0.0, duration: 0.12, gain: 0.12 },    // A5
        { freq: 1046.5, time: 0.04, duration: 0.14, gain: 0.15 }, // C6
        { freq: 1318.5, time: 0.08, duration: 0.16, gain: 0.18 }, // E6
        { freq: 1568, time: 0.12, duration: 0.18, gain: 0.14 },   // G6
        { freq: 1760, time: 0.16, duration: 0.22, gain: 0.10 }    // A6
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

        // Envelope: instant attack, exponential decay for sparkly effect
        gainNode.gain.setValueAtTime(0, now + note.time);
        gainNode.gain.linearRampToValueAtTime(note.gain, now + note.time + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

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
