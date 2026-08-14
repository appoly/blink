# Security Policy

## Supported versions

Blink is distributed through GitHub Releases, and security fixes land on the latest release line — the safest thing is to stay current.

## Reporting a vulnerability

Please report security issues **privately**, not in public issues or pull requests.

Open a private report through GitHub: go to the repository's **Security** tab and click **Report a vulnerability** (GitHub Private Vulnerability Reporting). That keeps the details confidential until a fix is out.

We aim to acknowledge a report within a few business days, confirm the issue, and ship a fix in a patch release. Please allow a reasonable window to release that fix before any public disclosure.

## Scope

The areas most worth probing are:

- The AI-import path (the New dialog parses pasted JSON from arbitrary AI output into a project)
- The Tauri commands exposed to the webview (file read and write for `.avatar` projects and exports)
- Generated exports (the SVG/CSS components and GIFs Blink writes to disk)

Issues that require an already-compromised machine, or that rely on tricking the user into running something outside the app, are out of scope.
