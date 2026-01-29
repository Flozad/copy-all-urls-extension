# Umbrella Documentation

Clean, minimalistic documentation website for the Umbrella Chrome extension built with Next.js 15.

## Features

- **Next.js 15** with App Router and static export
- **Tailwind CSS** for clean black-and-white styling
- **MDX** for easy documentation maintenance
- **TypeScript** for type safety
- **SEO optimized** with comprehensive metadata
- **Vercel ready** for instant deployment

## Development

Install dependencies:

```bash
bun install
```

Run the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site.

## Building

Build the static site:

```bash
bun run build
```

The static files will be generated in the `out` directory.

## Deployment

### Vercel (Recommended)

1. Push this directory to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js and deploy

### Other Static Hosts

Deploy the `out` directory to:
- **GitHub Pages**: Configure Pages to use the `out` directory
- **Netlify**: Drag and drop the `out` directory
- **Cloudflare Pages**: Connect your repo and deploy
- **Any static host**: Upload the contents of `out`

## Adding Documentation

1. Create new `.mdx` files in `app/docs/[page]/page.mdx`
2. Add metadata export at the top:
```tsx
export const metadata = {
  title: 'Page Title',
  description: 'Page description',
};
```
3. Write content using Markdown
4. Update `app/docs/layout.tsx` to add the page to navigation

## Project Structure

```
├── app/
│   ├── docs/              # Documentation pages (MDX)
│   ├── layout.tsx         # Root layout with header/footer
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── public/                # Static assets
├── next.config.mjs        # Next.js configuration
├── tailwind.config.ts     # Tailwind configuration
└── tsconfig.json          # TypeScript configuration
```

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-docs`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing documentation'`)
5. Push to the branch (`git push origin feature/amazing-docs`)
6. Open a Pull Request

## License

MIT
