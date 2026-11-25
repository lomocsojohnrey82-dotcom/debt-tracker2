# Store Debt Tracker

A simple, offline debt (utang) tracker for a mini convenience store.
Built with plain HTML, CSS, and JavaScript. No install or server needed.

## How to use

1. Unzip the folder.
2. Double-click `index.html` to open it in your browser (Chrome, Edge, Firefox, etc.).
3. Add customers, then record credit sales and payments.

## Features

- Add customers (name and optional phone)
- Record credit sales with items/notes and payments
- Per-customer ledger with running balance
- Search customers, sorted by amount owed
- Summary: total receivables, customers with unpaid balances
- Export all transactions to CSV (opens in Excel or Google Sheets)
- Dark mode follows your device setting

## Data storage

Data is saved in the browser's localStorage on that computer. It does not sync
between devices. Clearing browser data erases it, so export CSV backups regularly.
Use the same browser and profile each time you open the tracker.

## Changing the currency

In `js/app.js`, change `"en-PH"` and `"PHP"` in the `money` formatter, and the
₱ symbol in `index.html`.

## Files

- `index.html`: page structure
- `css/style.css`: styling and dark mode
- `js/app.js`: all logic and storage
