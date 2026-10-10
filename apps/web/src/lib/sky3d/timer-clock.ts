/**
 * Clock-shaped wrapper around THREE.Timer.
 *
 * @react-three/fiber 9 still constructs THREE.Clock when <Canvas> mounts.
 * three r183+ warns on that constructor; this keeps the fields R3F writes
 * (elapsedTime, oldTime, start/stop/getDelta) while the time source is Timer.
 */

import { Timer } from "three";

export class TimerClock {
  autoStart: boolean;
  startTime = 0;
  oldTime = 0;
  elapsedTime = 0;
  running = false;

  private timer = new Timer();

  constructor(autoStart = true) {
    this.autoStart = autoStart;
    if (autoStart) this.start();
  }

  start() {
    this.timer = new Timer();
    this.startTime = performance.now();
    this.oldTime = this.startTime;
    this.elapsedTime = 0;
    this.running = true;
  }

  stop() {
    this.getElapsedTime();
    this.running = false;
    this.autoStart = false;
  }

  getElapsedTime() {
    this.getDelta();
    return this.elapsedTime;
  }

  getDelta() {
    if (this.autoStart && !this.running) {
      this.start();
      return 0;
    }
    if (!this.running) return 0;

    this.timer.update();
    const diff = this.timer.getDelta();
    this.elapsedTime = this.timer.getElapsed();
    this.oldTime = this.startTime + this.elapsedTime * 1000;
    return diff;
  }
}
