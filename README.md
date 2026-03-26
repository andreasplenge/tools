# friendly-test-suite

Analytics dashboard and tools for [andreasplenge.com](https://andreasplenge.com), deployed at [tools.andreasplenge.com](https://tools.andreasplenge.com).

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (edge functions + database)
- GitHub Pages

## Development

```bash
npm install
npm run dev
```

## Deployment

Pushes to `main` automatically deploy to [tools.andreasplenge.com](https://tools.andreasplenge.com) via GitHub Actions.

Required repository variables (Settings → Secrets and variables → Actions → Variables):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
