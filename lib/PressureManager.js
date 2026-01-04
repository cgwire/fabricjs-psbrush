import { fabric } from "fabric";
import PSPoint from "./PSPoint";
import { getPressure } from "./utils";

class PressureManager {
  constructor(brush) {
    this.min = 0.0001;
    this.magic = 0.07999999821186066;
    this.fallback = 0.1;
    this.brush = brush;
  }

  onMouseDown(ev) {
    const pressure = getPressure(ev, this.fallback);
    return pressure === this.magic ? this.min : pressure;
  }

  onMouseMove(ev, points) {
    const pressure = getPressure(ev, this.fallback);
    const pressureShouldBeIgnored =
      this.brush.pressureIgnoranceOnStart >
      Date.now() - this.brush.currentStartTime;
    const hasPreviousPressureValues =
      Array.isArray(points) && points.length > 0;
    const lastPressure = hasPreviousPressureValues
      ? points[points.length - 1].pressure
      : this.min;

    const updatedPressure = pressureShouldBeIgnored
      ? this.min
      : pressure === this.magic
        ? lastPressure
        : Math.max(this.min, pressure);

    if (
      !pressureShouldBeIgnored &&
      hasPreviousPressureValues &&
      lastPressure === this.min &&
      updatedPressure !== this.min
    ) {
      points.forEach(
        (p) => (p.pressure = Math.max(p.pressure, updatedPressure)),
      );
      this.brush["_redrawSegments"](points);
    }
    return updatedPressure;
  }

  onMouseUp() {}
}

fabric["PressureManager"] = PressureManager;
export default PressureManager;
