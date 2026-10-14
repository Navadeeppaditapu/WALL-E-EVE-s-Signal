/**
 * Seeded Pseudo-Random Number Generator (Mulberry32) and Gaussian distribution utilities.
 * Ensures reproducible simulations, benchmark consistency, and configurable sensor noise.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed ? (seed >>> 0) : 1337;
  }

  /**
   * Returns a pseudo-random floating-point number between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer between min (inclusive) and max (inclusive).
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a sample from a standard Gaussian (Normal) distribution
   * using the Box-Muller transform: N(mean, stdDev^2)
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    let u1 = this.next();
    let u2 = this.next();
    // Avoid log(0)
    while (u1 <= 1e-15) {
      u1 = this.next();
    }
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Shuffles an array in place using the Fisher-Yates algorithm.
   */
  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
