import PSPoint from "./PSPoint";

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

export function createFabricClass(Parent, methods) {
  function Class() {
    const instance = Object.create(Parent.prototype);
    Object.assign(instance, methods);
    instance.callSuper = function (methodName, ...args) {
      const parentMethod = Parent.prototype[methodName];
      if (typeof parentMethod === "function") {
        return parentMethod.apply(this, args);
      }
    };
    if (instance.initialize) {
      instance.initialize.apply(instance, arguments);
    }
    return instance;
  }
  Class.prototype = Object.create(Parent.prototype);
  Object.assign(Class.prototype, methods);
  Class.prototype.constructor = Class;
  Class.prototype.callSuper = function (methodName, ...args) {
    const parentMethod = Parent.prototype[methodName];
    if (typeof parentMethod === "function") {
      return parentMethod.apply(this, args);
    }
  };
  return Class;
}
