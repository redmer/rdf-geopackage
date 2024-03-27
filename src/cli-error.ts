import { stderr } from "node:process";
import { format } from "node:util";
import supportsColor from "supports-color";

const COLORS = {
  RED: "\x1b[41m",
  YELLOW: "\x1b[43;1m",
  RESET: "\x1b[0m",
};

/** Report an error to stderr and exit with error */
export function Bye(message: string, ...optionalParams: any[]): never {
  if (supportsColor.stderr)
    stderr.write(
      format(
        `${COLORS.RED} Fatal error: ${COLORS.RESET} ${message}\n`,
        ...optionalParams,
      ),
    );
  else stderr.write(format(`# Fatal error: ${message}\n`, ...optionalParams));
  process.exit(500);
}

/** Report an non-fatal issue */
export function Warn(message: string, ...optionalParams: any[]): void {
  if (supportsColor.stderr)
    stderr.write(
      format(
        `${COLORS.YELLOW} Warning: ${COLORS.RESET} ${message}\n`,
        ...optionalParams,
      ),
    );
  else stderr.write(format(`# Warning: ${message}\n`, ...optionalParams));
}

let WARNINGS: Record<string, number> = {};

/** Collect warnings and output with call counts with OutputWarnCounts() */
export function CountWarn(message: string): void {
  const value = WARNINGS[message];
  WARNINGS[message] = value === undefined ? 1 : value + 1;
}

/** Output collected warnings (CountWarn) with call counts */
export function OutputWarnCounts(): void {
  for (const [message, count] of Object.entries(WARNINGS))
    Warn(`${message}: ${count}`);
  WARNINGS = {};
}
