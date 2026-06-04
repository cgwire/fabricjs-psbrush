export function isPSStroke(object) {
  return object && object["type"] === "PSStroke";
}

export function isPSPoint(object) {
  return object && object["type"] === "PSPoint";
}

export function getPressure(ev, fallbackValue = 0.5) {
  if (ev["touches"] && ev["touches"].length > 0) {
    return ev.touches[0].force;
  }
  if (ev["pointerType"] === "mouse" || typeof ev["pressure"] !== "number") {
    return fallbackValue;
  }
  if (ev["pointerType"] === "touch" && ev.pressure === 0) {
    return fallbackValue;
  }
  return ev.pressure;
}
