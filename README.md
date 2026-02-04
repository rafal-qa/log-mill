# Log Mill

![](doc/header.png)

_Log mill - a tool for processing raw logs into clean, usable output._

## About

A command-line TypeScript/Node.js application for log processing,
providing an extendable architecture for implementing custom log analysis and reporting.

Built from composable components:

- **Parser** extracts data from log entries
- **Processor** transforms, calculates, aggregates data
- **Reporter** presents processed data as a final report

Components can be combined freely as long as data formats are compatible.
For example, reuse an existing parser and processor with a new PDF reporter
instead of the built-in HTML reporter.

## Options

Show options: `node dist/index.js --help`

```bash
Usage: log-mill [options]

Analyze log files and generate reports

Options:
  -i, --input <path>       Input log file path
  -d, --output-dir <path>  Output directory for reports and state
  -m, --mode <mode>        Analysis mode (e.g., http-access)
  -h, --help               display help for command
```

Example: `node dist/index.js -i access.log -d out -m http-access`

## Analysis modes

`http-access`

- parse webserver log in _combined_ format
- calculate number of entries per day
- save report as HTML file
