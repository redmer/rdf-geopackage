/** Report an error to stderr and exit with error */
export function Bye(message: string, ...optionalParams: any[]): never {
  console.error(`Fatal error: ${message}`, ...optionalParams);
  process.exit(500);
}
