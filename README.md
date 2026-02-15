# Log Mill

![](doc/header.png)

_Log mill - a tool for processing raw logs into clean, usable output._

## Purpose

A do-it-yourself scaffold for building custom log analysis tools.
It provides the architecture, patterns, and built-in features like incremental processing with state persistence.
You can reuse already developed components or implement specific logic for your use case.

## About

A command-line TypeScript/Node.js application built from composable components:

- **Parser** extracts data from log entries
- **Processor** transforms, calculates, aggregates data
- **Reporter** presents processed data as a final report

Components can be combined freely as long as data formats are compatible.
For example, reuse an existing parser and processor with a new PDF reporter instead of the built-in HTML reporter.

## Features

### Built into the architecture

- Incremental processing with resume support
- Streaming (handles large files efficiently)
- Atomic state persistence (crash-safe)
- Compressed file support (`.gz`)
- Optional YAML configuration

### Included log analyzers

- HTTP server log analysis (referring websites report)
- Syslog analysis (application activity over time)

## Options

Show options: `node dist/index.js --help`

```
Usage: log-mill [options]

Analyze log files and generate reports

Options:
  -i, --input <path>       input log file path (plain text or .gz)
  -d, --output-dir <path>  output directory for reports and state
  -m, --mode <mode>        analysis mode (http-access, syslog-apps)
  -c, --config <path>      config file path (for modes requiring it)
  -h, --help               display help for command
```

## Try it yourself

Use the pre-configured example files

```bash
node dist/index.js -i example/log/access.log -d output -m http-access -c example/config/http-access.config.yaml
```

```bash
node dist/index.js -i example/log/syslog.log -d output -m syslog-apps
```

## Use cases

### Update report periodically with new data

This is the most basic use case. Log lines processed in previous run are skipped and report updated with new data.
Just point `log-mill` to a current log file and run as frequent as you wish.

If you want to automate it and logs are rotated, make sure to run `log-mill` before rotating.

### Analyze historical rotated logs

**Scenario**

- Logs are rotated, we have files like `access.log access.log.1 access.log.2.gz ... access.log.10.gz`
- We want to generate a report combining data from all historical files, not only from current log.
- Plain text and compressed files are mixed.

**Solution**

- Run `log-mill` for every log file separately, starting from the oldest, keeping the same `output-dir`.
- Incremental processing also works with multiple files, newer data is added to previous data.
- Compressed files are handled out-of-the-box (only gzip).

Example Bash script:

```bash
ls -tr "/var/log/apache/"access.log* | while IFS= read -r file; do
    node dist/index.js -i "$file" -d output -m http-access -c my-website.config.yaml
done
```

## Built-in analysis modes

### `http-access`

- Parser: parse webserver log in _combined_ format
- Processor: calculate number of entries per day and collect external referrers
- Reporter: save report as HTML file

### `syslog-apps`

- Parser: parse system logs in Syslog format
- Processor: aggregate number of log entries per application and per day
- Reporter: save report as HTML file with interactive charts per application

## Architecture

### Overview

- Each analysis mode is composed of 3 component types: `Parser`, `Processor`, `Reporter` wired together in `index.ts`.
- The same component implementation can be used in multiple modes, as long as they are compatible.
  - `Parser` returns the same data type as `Processor` accepts.
  - `Processor` returns the same data type as `Reporter` accepts.
- Components requiring additional configuration implement the `Configurable` interface. Method `configure` which is
  **automatically called**, uses `ConfigData` containing data from the parsed configuration file. This is a YAML file
  provided as a CLI parameter. If several components need configuration, they use the same file.

### Adding new mode and components

To add an `example` mode with a new log format, following files are affected:

```
src/
├── index.ts                           # Register mode
├── parsers/
│   ├── formats/
│   │   └── new-log-format.ts          # Implement LogFormat
│   └── example-parser.ts              # Build ParsedRecord<ExampleRecord>
├── processors/
│   └── example/
│       └── processor.ts               # Process ParsedRecord<ExampleRecord> → ExampleData
│                                      # Merge with previous state (incremental)
└── reporters/
    └── example/
        └── reporter.ts                # Generate report from ExampleData
```

New data types:

- `ExampleRecord` - Data extracted from a single log line.
- `ExampleData` - Aggregated and calculated data from multiple log lines. **Must be JSON-serializable** because it is
  persisted in JSON format between runs.
