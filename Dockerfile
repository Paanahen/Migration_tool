# -------- Stage 1: Build React (Vite) --------
FROM node:20 AS frontend-builder

# Set working directory inside container
WORKDIR /app/frontend

# Copy package.json and lock file first
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy all frontend files
COPY frontend/ .

# Build React (Vite) app → outputs 'dist/'
RUN npm run build

# -------- Stage 2: Build Python Flask App --------
FROM python:3.12-slim

# Set working directory inside container
WORKDIR /app

# Copy backend folder into container
COPY backend/ ./backend/

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy Vite build output from frontend-builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/build

# Set working directory to backend
WORKDIR /app/backend

# Expose Flask default port
EXPOSE 5000

# Run Flask app
CMD ["python", "app.py"]
