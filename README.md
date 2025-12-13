# Threadline

**Code standards that teach themselves.**

An AI-powered linter based on your natural language documentation. Threadline runs focused, parallel code checks that flag issues based on your team's documented standards—without fixing them.

## What It Does

Threadline helps teams maintain consistent code quality by:

- **Documentation that lives with your code** - Standards live in a `/threadlines` folder, version-controlled alongside your codebase
- **Focused AI experts** - Each expert checks one specific concern, running in parallel
- **Fully auditable** - Every check is logged and traceable
- **Simple configuration** - Works out of the box, just add your experts and run

## Getting Started

1. **Run the check**
   ```bash
   npx threadline check
   ```

2. **Add your threadlines**
   Create a `/threadlines` folder in your repository and add markdown files defining your coding standards.

3. **See it in action**
   Make a change, run the check, and see which threadlines flag issues.

## How It Works

1. Define your threadlines as markdown files in `/threadlines`
2. Run `npx threadline check` when reviewing changes
3. Threadline validates experts, collects git diffs, and runs parallel AI reviews
4. Get focused feedback—only experts that need attention are shown

## Project Status

🚧 **In Development** - Coming soon

## Learn More

- [Vision](./docs/VISION.md) - The problem we solve
- [How It Works](./docs/HOW_IT_WORKS.md) - Technical overview
- [Technical Plan](./docs/TECHNICAL_PLAN.md) - Implementation details

## License

MIT
