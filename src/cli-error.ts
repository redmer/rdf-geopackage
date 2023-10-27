import supportsColor from "supports-color";

const COLORS = {
  RED: "\x1b[41m",
  YELLOW: "\x1b[43;1m",
  RESET: "\x1b[0m",
};

/** Report an error to stderr and exit with error */
export function Bye(message: string, ...optionalParams: any[]): never {
  if (supportsColor.stderr)
    console.error(
      `${COLORS.RED} Fatal error: ${COLORS.RESET} ${message}`,
      ...optionalParams,
    );
  else console.error(`# Fatal error: ${message}`, ...optionalParams);
  process.exit(500);
}

/** Report an non-fatal issue */
export function Warn(message: string, ...optionalParams: any[]): void {
  if (supportsColor.stderr)
    console.warn(
      `${COLORS.YELLOW} Warning: ${COLORS.RESET} ${message}`,
      ...optionalParams,
    );
  else console.warn(`# Warning: ${message}`, ...optionalParams);
}
