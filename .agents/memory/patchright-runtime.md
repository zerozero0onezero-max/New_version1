---
name: Patchright runtime
description: Environment requirements and response handling for the browser automation service.
---

Patchright can be installed successfully while Chromium still fails to launch if its Linux shared libraries are absent. In this environment, the browser required the Chromium download plus GLib, GBM, ALSA, systemd, and related X11/NSS libraries.

**Why:** The UI and API may appear healthy while browser actions fail only when the first launch is attempted.

**How to apply:** When browser automation reports launch errors, inspect the missing shared library in the launch log, install the supported system package, restart the artifact workflow, and retest a real public page.

Patchright screenshot responses may arrive as a Node Buffer even when screenshot options request Base64. Convert the returned bytes with `Buffer.from(image).toString('base64')` before serializing JSON.

**Why:** JSON serializes a Buffer as `{ type: "Buffer", data: [...] }`, which cannot be used directly as an image source in the browser.

**How to apply:** Keep the API response as a Base64 string and prepend `data:image/jpeg;base64,` only in the client.