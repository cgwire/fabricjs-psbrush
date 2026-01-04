class Simplify {
  set tolerance(tolerance) {
    if (typeof tolerance !== "number") {
      tolerance = 1;
    }
    this._tolerance = tolerance;
    this.sqTolerance = tolerance * tolerance;
  }
  get tolerance() {
    return this._tolerance;
  }

  constructor() {
    this._tolerance = 1;
    this.sqTolerance = 1;
  }

  getSquareDistance(p1, p2) {
    let dx = p1.x - p2.x;
    let dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  }

  getSquareSegmentDistance(p, p1, p2) {
    let x = p1.x;
    let y = p1.y;
    let dx = p2.x - x;
    let dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {
      let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

      if (t > 1) {
        x = p2.x;
        y = p2.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = p.x - x;
    dy = p.y - y;

    return dx * dx + dy * dy;
  }

  simplifyRadialDistance(points) {
    let prevPoint = points[0];
    let newPoints = [prevPoint];
    let point;

    for (let i = 1, len = points.length; i < len; i++) {
      point = points[i];

      if (this.getSquareDistance(point, prevPoint) > this.sqTolerance) {
        newPoints.push(point);
        prevPoint = point;
      }
    }

    if (prevPoint !== point) {
      newPoints.push(point);
    }

    return newPoints;
  }

  simplifyDouglasPeucker(points) {
    let len = points.length;
    let MarkerArray = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    let markers = new MarkerArray(len);
    let first = 0;
    let last = len - 1;
    let stack = [];
    let newPoints = [];
    let i;
    let maxSqDist;
    let sqDist;
    let index;

    markers[first] = markers[last] = 1;

    while (last) {
      maxSqDist = 0;

      for (i = first + 1; i < last; i++) {
        sqDist = this.getSquareSegmentDistance(
          points[i],
          points[first],
          points[last],
        );

        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }

      if (maxSqDist > this.sqTolerance) {
        markers[index] = 1;
        stack.push(first, index, index, last);
      }

      last = stack.pop();
      first = stack.pop();
    }

    for (i = 0; i < len; i++) {
      if (markers[i]) {
        newPoints.push(points[i]);
      }
    }

    return newPoints;
  }

  do(points, highestQuality) {
    points = highestQuality ? points : this.simplifyRadialDistance(points);
    points = this.simplifyDouglasPeucker(points);
    return points;
  }
}

export default Simplify;
