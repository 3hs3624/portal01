# ExcelJS

ExcelJS 4.4.0 is served from this directory for the project list and WBS detail workbook features. This keeps the existing `script-src` policy and removes runtime CDN dependencies.

- Source: https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js
- License: MIT, see exceljs-LICENSE.txt
- SHA-256: `7e49da68588e250dbb8bba190d2caa8ab3787cc0284bda1d8b2f805c4df742c9`

The WBS detail template is gzip/base64 encoded in `../index.html`. If its script changes, update the matching inline hash in the parent Content Security Policy together with the list script hash. Do not enable external scripts or unsafe inline execution.

Verification from repository root: `python3 tests/projects_excel.py` (Playwright, Chromium and openpyxl). It downloads real workbooks, checks current filters and all pages, tests library-load retry, and verifies WBS worksheets and formulas without external requests.
