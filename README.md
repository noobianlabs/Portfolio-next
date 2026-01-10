# Abdullah Saleh's portfolio
This is my personal portfolio, outlining my experience and skills.
If you find a bug. Please report it in the issue tracker and enjoy the website! <3

You can see the production version [here](https://abdullahsaleh.com/)!

## Branching Strategy

To keep the production environment stable, follow this branching model:
- `main`: Production-ready code.
- `feat/`: New features (e.g., `feat/contact-form`).
- `fix/`: Bug fixes.
- `chore/`: Maintenance (dependencies, config, etc.).

**Before pushing to main:** Run the Antigravity workflow `/safe-push`.

## Installing dependencies
To install all the dependencies, run the following command:
```
npm i
```

## Build
To build all the apps and packages, run the following command from the root:
```
npm run build
```

## Develop
To develop at all the apps and packages, run the following command from the root:
```
npm run dev
```
The `web` app starts on http://localhost:3000/
The `desktop` app starts on http://localhost:3001/
36: 
37: ## Credits & Appreciation
38: 
39: This portfolio is built upon the incredible work of:
40: - **[Joey de Ruiter](https://github.com/joeyderuiter/Portfolio-next)**: For the original Unix-inspired framework and virtual file system.
41: - **[Henry Heffernan](https://henryheffernan.com/)**: For the visual inspiration and pioneering interactive desktop portfolios.
42: 
43: Special thanks to everyone who has contributed to the open-source projects that made this possible.
