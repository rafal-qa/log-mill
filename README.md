# Log Mill

![](doc/header.png)

_Log mill - a tool for processing raw logs into clean, usable output._

## Purpose

A do-it-yourself scaffold for building custom log analysis tools.
It provides the architecture, patterns, and built-in features like incremental processing and state persistence.
You can reuse already developed components or implement specific logic for your use case.

## About

A command-line TypeScript/Node.js application built from composable components:

- **Parser** extracts data from log entries
- **Processor** transforms, calculates, aggregates data
- **Reporter** presents processed data as a final report

Components can be combined freely as long as data formats are compatible.
For example, reuse an existing parser and processor with a new PDF reporter instead of the built-in HTML reporter.

## Options

Show options: `node dist/index.js --help`

```
Usage: log-mill [options]

Analyze log files and generate reports

Options:
  -i, --input <path>       input log file path (plain text or .gz)
  -d, --output-dir <path>  output directory for reports and state
  -m, --mode <mode>        analysis mode (available: http-access)
  -c, --config <path>      config file path (for modes requiring it)
  -h, --help               display help for command
```

Try it yourself with the pre-configured example files:

`node dist/index.js -i example/log/access.log -d out -m http-access -c example/config/http-access.config.yaml`

## Built-in analysis modes

`http-access`

- Parser: parse webserver log in _combined_ format
- Processor: calculate number of entries per day and collect external referrers
- Reporter: save report as HTML file
