// The size of a draggable point on the canvas
const POINT_RADIUS = 4.0;

/**
 * A 2D point
 */
class Point {
  constructor(public x: number, public y: number) {}

  /**
   *
   * @param ctx Context to use for drawing
   * @param color the fill color of the point
   */
  plot(ctx: CanvasRenderingContext2D, color: string = "black"): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, POINT_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /** Determine if another point is close enough to this one
   *
   * This method is used to check for mouse clicks
   *
   * @param other The point to check for closeness
   * @returns Either `true` or `false
   */
  isCloseTo(other: Point): Boolean {
    let dist = subPP(this, other).norm();
    return dist < 2 * POINT_RADIUS;
  }
}

/**
 * A 2D vector
 *
 * Unlike points, vectors are not fixed to a spot in space but can
 * be moved freely.
 */
class Vec {
  constructor(public x: number, public y: number) {}

  /// Compute the squared norm of the vector
  norm2(): number {
    return this.x * this.x + this.y * this.y;
  }

  /// Compute the norm of the vector
  norm(): number {
    return Math.sqrt(this.norm2());
  }
}

/// Add a vector to a point
function addPV(pt: Point, v: Vec): Point {
  return new Point(pt.x + v.x, pt.y + v.y);
}

/// Add two vectors
function addVV(v1: Vec, v2: Vec): Vec {
  return new Vec(v1.x + v2.x, v1.y + v2.y);
}

// Subtract two points
function subPP(pt1: Point, pt2: Point): Vec {
  return new Vec(pt2.x - pt1.x, pt2.y - pt1.y);
}

// Subtract two vectors
function subVV(v1: Vec, v2: Vec): Vec {
  return new Vec(v1.x - v2.x, v1.y - v2.y);
}

/// Multiply a point by a scalar
function mulSP(scalar: number, pt: Point): Point {
  return new Point(scalar * pt.x, scalar * pt.y);
}

/// Dot product between two vectors
function dot(v1: Vec, v2: Vec): number {
  return v1.x * v2.x + v1.y * v2.y;
}

/** Compute an angle given its vertex and two points along the two sides
 *
 * @param vertex Vertex of the angle
 * @param pt1 Point along the first side of the angle
 * @param pt2 Point along the second side of the angle
 * @returns The value of the angle, in radians
 */
function getAngle(vertex: Point, pt1: Point, pt2: Point): number {
  let side1 = subPP(pt1, vertex);
  let side2 = subPP(pt2, vertex);

  let dotprod = dot(side1, side2);
  let cosine = dotprod / (side1.norm() * side2.norm());
  return Math.acos(cosine);
}

/// Identifier for one of the vertexes of a triangle
type TriangleVertexIndex = 1 | 2 | 3;

/**
 * A 2D triangle
 *
 * The class has the following fields:
 *
 * - `pt1`, `pt2`, `pt3`: the three vertexes
 * - `angleA`, `angleB`, `angleC`: the three angles (in radians)
 * - `sideA`, `sideB`, `side`C`: the length of the three sides,
 *   each opposite to the corresponding angle
 */
class Triangle {
  public angleA: number = 0.0;
  public angleB: number = 0.0;
  public angleC: number = 0.0;
  public sideA: number = 0.0;
  public sideB: number = 0.0;
  public sideC: number = 0.0;

  constructor(public pt1: Point, public pt2: Point, public pt3: Point) {
    this.recalcAll();
  }

  private recalcAll(): void {
    this.angleA = getAngle(this.pt1, this.pt2, this.pt3);
    this.angleB = getAngle(this.pt2, this.pt1, this.pt3);
    this.angleC = getAngle(this.pt3, this.pt1, this.pt2);

    this.sideA = subPP(this.pt3, this.pt2).norm();
    this.sideB = subPP(this.pt1, this.pt3).norm();
    this.sideC = subPP(this.pt1, this.pt2).norm();
  }

  /** Determine the coordinates of a point given its trilinear coordinates
   *
   * See <https://en.wikipedia.org/wiki/Trilinear_coordinates>
   *
   * @param x The first trilinear coordinate, related to A
   * @param y The second trilinear coordinate, related to B
   * @param z The third trilinear coordinate, related to C
   * @returns A Point object
   */
  getPointFromTrilinearCoords(x: number, y: number, z: number): Point {
    let a = this.sideA;
    let b = this.sideB;
    let c = this.sideC;
    let denom = a * x + b * y + c * z;

    let add1 = mulSP((a * x) / denom, this.pt1);
    let add2 = mulSP((b * y) / denom, this.pt2);
    let add3 = mulSP((c * z) / denom, this.pt3);

    return new Point(add1.x + add2.x + add3.x, add1.y + add2.y + add3.y);
  }

  /// Modify the coordinates of one of the three vertexes
  updatePoint(vertexidx: TriangleVertexIndex, newpos: Point): void {
    switch (vertexidx) {
      case 1:
        this.pt1 = newpos;
        break;
      case 2:
        this.pt2 = newpos;
        break;
      case 3:
        this.pt3 = newpos;
        break;
    }

    this.recalcAll();
  }

  /// Draw the triangle on a HTML canvas
  draw(
    context: CanvasRenderingContext2D,
    stroke: string = "black",
    fill: string = "white"
  ): void {
    context.save();

    context.strokeStyle = stroke;
    context.fillStyle = fill;

    context.beginPath();
    context.moveTo(this.pt1.x, this.pt1.y);
    context.lineTo(this.pt2.x, this.pt2.y);
    context.lineTo(this.pt3.x, this.pt3.y);
    context.closePath();

    if (fill != "") {
      context.fill();
    }
    context.stroke();

    context.restore();
  }
}

/** Compute the first Morley triangle
 *
 * @param tr The input triangle
 * @returns a new `Triangle` object representing the first of Morley's triangles
 */
function firstMorleyTriangle(tr: Triangle): Triangle {
  // https://en.wikipedia.org/wiki/Morley%27s_trisector_theorem#Morley's_triangles
  return new Triangle(
    tr.getPointFromTrilinearCoords(
      1.0,
      2.0 * Math.cos(tr.angleC / 3),
      2.0 * Math.cos(tr.angleB / 3)
    ),
    tr.getPointFromTrilinearCoords(
      2.0 * Math.cos(tr.angleC / 3),
      1.0,
      2.0 * Math.cos(tr.angleA / 3)
    ),
    tr.getPointFromTrilinearCoords(
      2.0 * Math.cos(tr.angleB / 3),
      2.0 * Math.cos(tr.angleA / 3),
      1.0
    )
  );
}

/**
 * A point-dragging event
 *
 * An instance of this class is created whenever the user
 * clicks on one of the vertexes of the triangle and drags it.
 *
 * Fields:
 * - `pointidx`: the index of the vertex (1, 2, or 3)
 * - `mousestart`: the position of the mouse when the drag started
 * - `pointstart`: the position of the vertex when the drag started
 */
class PointDragEvent {
  constructor(
    public pointidx: TriangleVertexIndex,
    public mousestart: Point,
    public pointstart: Point
  ) {}
}

/**
 * The main application
 */
class MorleyApp {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private triangle: Triangle;
  private dragEvent: PointDragEvent | undefined;
  private touchEnabled: boolean;

  constructor() {
    let canvas = document.getElementById("morley_canvas") as HTMLCanvasElement;
    let context = canvas.getContext("2d") as CanvasRenderingContext2D;

    this.canvas = canvas;
    this.context = context;

    this.width = canvas.width;
    this.height = canvas.height;

    // Create a visually interesting triangle that covers most of the canvas
    this.triangle = new Triangle(
      new Point(this.width * 0.2, this.height * 0.2),
      new Point(this.width * 0.8, this.height * 0.8),
      new Point(this.width * 0.6, this.height * 0.3)
    );

    // Typically, this variable is `true` on mobile devices and
    // `false` on desktop computers
    this.touchEnabled = "createTouch" in document || "onstarttouch" in window;

    this.dragEvent = undefined;
    this.redraw();
    this.createUserEvents();
  }

  private createUserEvents(): void {
    let canvas = this.canvas;

    if (this.touchEnabled) {
      canvas.addEventListener("touchstart", this.pressEventHandler);
      canvas.addEventListener("touchmove", this.dragEventHandler);
      canvas.addEventListener("touchend", this.releaseEventHandler);
    } else {
      canvas.addEventListener("mousedown", this.pressEventHandler);
      canvas.addEventListener("mousemove", this.dragEventHandler);
      canvas.addEventListener("mouseup", this.releaseEventHandler);
    }
  }

  /**
   * Return the position of the mouse/touch associated with an event
   *
   * @param ev The event
   * @returns A `Point` object containing the position of the mouse/touch
   * (absolute coordinates!)
   */
  mousePos(ev: MouseEvent | TouchEvent): Point {
    if (this.touchEnabled) {
      let touchev = ev as TouchEvent;
      return new Point(
        touchev.changedTouches[0].pageX,
        touchev.changedTouches[0].pageY
      );
    } else {
      let mouseev = ev as MouseEvent;
      return new Point(mouseev.pageX, mouseev.pageY);
    }
  }

  pressEventHandler = (ev: MouseEvent | TouchEvent) => {
    if (this.touchEnabled) {
      ev.preventDefault();
    }

    let mousepos = this.mousePos(ev);

    let relativepos = new Point(
      mousepos.x - this.canvas.offsetLeft,
      mousepos.y - this.canvas.offsetTop
    );

    if (this.triangle.pt1.isCloseTo(relativepos)) {
      this.dragEvent = new PointDragEvent(1, relativepos, this.triangle.pt1);
      return;
    }

    if (this.triangle.pt2.isCloseTo(relativepos)) {
      this.dragEvent = new PointDragEvent(2, relativepos, this.triangle.pt2);
      return;
    }

    if (this.triangle.pt3.isCloseTo(relativepos)) {
      this.dragEvent = new PointDragEvent(3, relativepos, this.triangle.pt3);
      return;
    }
  };

  dragEventHandler = (ev: MouseEvent | TouchEvent) => {
    if (this.dragEvent === undefined) {
      return;
    }

    if (this.touchEnabled) {
      ev.preventDefault();
    }

    let de = this.dragEvent as PointDragEvent;

    let mousepos = this.mousePos(ev);
    let relativepos = new Point(
      mousepos.x - this.canvas.offsetLeft,
      mousepos.y - this.canvas.offsetTop
    );

    this.triangle.updatePoint(
      de.pointidx,
      new Point(
        de.pointstart.x + (relativepos.x - de.mousestart.x),
        de.pointstart.y + (relativepos.y - de.mousestart.y)
      )
    );

    this.context.clearRect(0, 0, this.width, this.height);
    this.redraw();

    ev.preventDefault();
  };

  releaseEventHandler = (ev: MouseEvent | TouchEvent) => {
    this.dragEvent = undefined;
    if (this.touchEnabled) {
      ev.preventDefault();
    }
  };

  private line(pt1: Point, pt2: Point, color: string = "black"): void {
    let ctx = this.context;

    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  private redraw(): void {
    let tr = this.triangle;

    let firstTr = firstMorleyTriangle(tr);

    let ctx = this.context;

    tr.draw(ctx, "black", "white");
    firstTr.draw(ctx, "black", "lightgreen");

    this.line(tr.pt1, firstTr.pt2, "gray");
    this.line(tr.pt1, firstTr.pt3, "gray");

    this.line(tr.pt2, firstTr.pt1, "gray");
    this.line(tr.pt2, firstTr.pt3, "gray");

    this.line(tr.pt3, firstTr.pt1, "gray");
    this.line(tr.pt3, firstTr.pt2, "gray");

    tr.pt1.plot(ctx);
    tr.pt2.plot(ctx);
    tr.pt3.plot(ctx);
  }
}

new MorleyApp();
