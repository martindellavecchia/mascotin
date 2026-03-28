# 🐾 mascoT-In

Aplicación para conectar mascotas y encontrar amigos peludos.

## ✨ Características

- **💘 Sistema de Swipe** - Interfaz tipo Tinder para dar like o pasar perfiles de mascotas
- **🎯 Matching Automático** - Detección instantánea cuando ambas mascotas se gustan
- **💬 Chat** - Sistema de mensajería entre mascotas que hicieron match
- **🐕 Perfiles de Mascotas** - Nombre, raza, edad, fotos, actividades, ubicación
- **📱 Diseño Responsivo** - Optimizado para móvil y escritorio
- **🎨 UI Moderna** - Animaciones suaves con Framer Motion

## 🛠️ Tech Stack

- **Next.js 15** - React framework con App Router
- **TypeScript** - Desarrollo type-safe
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Componentes accesibles basados en Radix UI
- **Prisma ORM** - Cliente de base de datos type-safe
- **PostgreSQL** - Base de datos (Neon serverless)
- **NextAuth.js** - Autenticación

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL

# Configurar base de datos
npx prisma generate
npx prisma db push

# Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) para ver la aplicación.

## 📝 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo en puerto 3000
- `npm run build` - Build de producción
- `npm run lint` - Ejecutar ESLint
- `npm run db:push` - Aplicar cambios de schema a la base de datos
- `npm run db:generate` - Generar Prisma Client
- `npm run db:migrate` - Ejecutar migraciones

## 🚀 Deployment

### Vercel

1. Push del código a GitHub
2. Importar proyecto en Vercel
3. Agregar `DATABASE_URL` y `NEXTAUTH_SECRET` como variables de entorno
4. Deploy!

---

Hecho con ❤️ para las mascotas 🐾
# mascotin
