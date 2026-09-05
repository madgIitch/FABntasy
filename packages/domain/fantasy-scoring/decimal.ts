const SCALE_DIGITS = 12;
const SCALE = BigInt(10) ** BigInt(SCALE_DIGITS);

export class Decimal {
  private constructor(private readonly units: bigint) {}

  static zero = new Decimal(BigInt(0));

  static from(value: string | number | bigint): Decimal {
    const text = String(value);
    if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error(`Invalid decimal: ${text}`);
    const negative = text.startsWith("-");
    const [whole, fraction = ""] = text.replace("-", "").split(".");
    const padded = (fraction + "0".repeat(SCALE_DIGITS)).slice(0, SCALE_DIGITS);
    const units = BigInt(whole) * SCALE + BigInt(padded);
    return new Decimal(negative ? -units : units);
  }

  add(other: Decimal) { return new Decimal(this.units + other.units); }
  sub(other: Decimal) { return new Decimal(this.units - other.units); }
  mul(other: Decimal) { return new Decimal(divHalfUp(this.units * other.units, SCALE)); }
  div(other: Decimal) {
    if (other.units === BigInt(0)) throw new Error("Division by zero");
    return new Decimal(divHalfUp(this.units * SCALE, other.units));
  }
  compare(other: Decimal) { return this.units < other.units ? -1 : this.units > other.units ? 1 : 0; }
  clamp(min: Decimal, max: Decimal) { return this.compare(min) < 0 ? min : this.compare(max) > 0 ? max : this; }
  sqrt() {
    if (this.units < BigInt(0)) throw new Error("Square root of negative decimal");
    return new Decimal(integerSqrt(this.units * SCALE));
  }

  round(scale: number): Decimal {
    const factor = BigInt(10) ** BigInt(SCALE_DIGITS - scale);
    return new Decimal(divHalfUp(this.units, factor) * factor);
  }

  toString(scale?: number): string {
    const rounded = scale == null ? this : this.round(scale);
    const negative = rounded.units < BigInt(0);
    const absolute = negative ? -rounded.units : rounded.units;
    const whole = absolute / SCALE;
    let fraction = (absolute % SCALE).toString().padStart(SCALE_DIGITS, "0");
    fraction = scale == null ? fraction.replace(/0+$/, "") : fraction.slice(0, scale);
    return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
  }
}

function divHalfUp(numerator: bigint, denominator: bigint): bigint {
  const negative = (numerator < BigInt(0)) !== (denominator < BigInt(0));
  const a = numerator < BigInt(0) ? -numerator : numerator;
  const b = denominator < BigInt(0) ? -denominator : denominator;
  const quotient = a / b;
  const rounded = a % b * BigInt(2) >= b ? quotient + BigInt(1) : quotient;
  return negative ? -rounded : rounded;
}

function integerSqrt(value: bigint): bigint {
  if (value < BigInt(2)) return value;
  let x = value;
  let y = (x + BigInt(1)) / BigInt(2);
  while (y < x) { x = y; y = (x + value / x) / BigInt(2); }
  return x;
}
