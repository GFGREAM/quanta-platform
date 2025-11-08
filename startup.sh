#!/usr/bin/env bash
set -e

echo "🌀 Iniciando despliegue de Quanta Portal en Azure..."

# 1. Verificar e instalar dependencias
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependencias..."
  npm ci
else
  echo "📦 Dependencias ya instaladas, continuando..."
fi

# 2. Compilar el proyecto Next.js (solo si no existe la carpeta .next)
if [ ! -d ".next" ]; then
  echo "🏗️ Compilando el proyecto Next.js..."
  npm run build
else
  echo "🏗️ Build detectado, omitiendo recompilación..."
fi

# 3. Iniciar el servidor Next.js
echo "🚀 Iniciando servidor Quanta Portal..."
exec npm start
