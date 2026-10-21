# Contributing

Thanks for helping improve Pathfind. Use a focused pull request and explain the user impact.

## Before changing code

- Open an issue or discuss the change with the maintainer first for larger changes.
- Keep changes focused and follow the existing React, TypeScript, and CSS patterns.
- Do not add or guess opportunity eligibility, deadlines, costs, or application links. Keep sourced opportunities distinct from generated ideas.
- Never include credentials, private student data, or `.env` files in a commit.

## Verify your change

Run the checks relevant to your change before opening a pull request:

```bash
npm ci
npm test
npm run eval:assistant:check
npm run build
```

Describe the user impact, list the checks you ran, and include screenshots for visible UI changes. Call out checks you could not run.
