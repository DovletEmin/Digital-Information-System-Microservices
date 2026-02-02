# SMU Admin Panel

Next.js-based admin panel for managing SMU Microservices content.

## Features

- 📝 **Articles Management** - Full CRUD operations for articles
- 📚 **Books Management** - Manage books with categories and subcategories
- 🎓 **Dissertations Management** - Handle dissertations and their metadata
- 📂 **Categories Management** - Organize content with hierarchical categories
- 🔐 **Authentication** - Secure login with JWT tokens
- 🔍 **Search & Filter** - Find content quickly
- 📊 **Dashboard** - Overview statistics

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Running API Gateway on `http://localhost:3000`

### Installation

1. Install dependencies:

```bash
cd admin-panel
npm install
```

2. Configure environment:

```bash
# .env.local
API_GATEWAY_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. Start development server:

```bash
npm run dev
```

The admin panel will be available at `http://localhost:3001`

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
admin-panel/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── articles/       # Articles CRUD
│   │   │   ├── books/          # Books CRUD
│   │   │   ├── dissertations/  # Dissertations CRUD
│   │   │   └── categories/     # Categories management
│   │   ├── login/              # Login page
│   │   └── layout.tsx          # Root layout
│   ├── components/             # React components
│   │   └── Sidebar.tsx         # Navigation sidebar
│   ├── services/               # API service layer
│   │   ├── articleService.ts
│   │   ├── bookService.ts
│   │   ├── dissertationService.ts
│   │   └── categoryService.ts
│   ├── lib/                    # Utilities
│   │   └── api.ts              # Axios instance
│   └── types/                  # TypeScript types
│       └── index.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## API Integration

The admin panel connects to your microservices through the API Gateway:

- **Auth Service**: `/auth/login`
- **Content Service**: `/content/*`
  - Articles: `/content/articles`
  - Books: `/content/books`
  - Dissertations: `/content/dissertations`
  - Categories: `/content/categories/*`

## Default Login

Update this with your actual credentials from the auth service.

## Features by Section

### Articles

- List all articles with pagination
- Create new articles
- Edit existing articles
- Delete articles
- Search articles
- Assign categories

### Books

- Manage books catalog
- Support for categories and subcategories
- Track views and ratings
- Multi-language support (tm, ru, en)

### Dissertations

- Academic papers management
- Hierarchical categorization
- Author workplace tracking

### Categories

- Three separate category systems
- Subcategories for books and dissertations
- Simple categories for articles

## Development

### Adding New Features

1. Create service in `src/services/`
2. Add types in `src/types/`
3. Create page in `src/app/dashboard/`
4. Add navigation link in `Sidebar.tsx`

### Styling

Uses Tailwind CSS utility classes. Global styles in `src/app/globals.css`.

## Deployment

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## License

MIT
