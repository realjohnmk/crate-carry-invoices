# Crate & Carry Invoices

Build a simple wholesale beverage invoicing app.



We sell drinks by full crate or half crate.



Example:



- Life — ₦8,500/crate

- Hero — ₦8,500/crate

- Trophy — ₦8,500/crate

- Gulder — ₦11,200/crate

- Star — ₦11,200/crate



Products and prices should be editable.



Adding products to an invoice



When I add a product, I want to enter the quantity naturally, such as:



- 1 crate

- 2 crates

- 3 crates

- 1.5 crates

- 2.5 crates

- etc.



Only whole or half crates should be allowed.



For each product line, immediately show:



Quantity: 2.5 crates

Crates returned: All (default)

Missing bottles: 0 (default)



The "Crates returned" field should allow me to specify how many crates from that particular product were returned.



Example:



Life — 2.5 crates sold

Crates returned: 1.5

Outstanding crates: 1



Missing bottles



Each product line should also have a Missing Bottles field, defaulting to 0.



Example:



Life — 2 crates

Missing bottles: 3



This should be tracked separately from crate returns.



Payments



An invoice should allow partial payments.



Example:



Total: ₦50,000

Paid: ₦20,000

Balance: ₦30,000



I should be able to add another payment later.



Important: Everything must update automatically



If I edit an existing invoice later, the calculations must update automatically.



For example:



Today:



- Customer buys 3 crates

- Pays ₦20,000

- Returns 1 crate



Later:



- Customer pays another ₦10,000

- Returns another 1 crate

- Has 2 missing bottles



The system should automatically update:



Money



- Total invoice

- Total paid

- Balance remaining



Crates



- Total crates sold

- Crates returned

- Crates outstanding



Bottles



- Missing bottles



The customer account should always reflect the latest information.



Customer account



For each customer, show:



- Total amount owed

- Total payments

- Outstanding crates

- Missing bottles

- Invoice history



If the customer later makes a payment or returns crates, their account and related invoice should update automatically.



Invoice



Show clearly:



Product | Quantity | Price | Total | Crates Returned | Crates Outstanding | Missing Bottles



Also show:



Invoice Total

Amount Paid

Balance



Keep the interface simple, fast, and mobile-friendly.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/59f44a3a-54b1-4e89-877a-919c6a2b6af3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
