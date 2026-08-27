# Step 1: Build .NET App + Tailwind CSS
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Install Node.js for Tailwind CLI
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Move into project directory to align with package.json location
WORKDIR /src/Itransition_task6

# Restore NPM packages
COPY package*.json ./
RUN npm ci

# Move back to root for solution-level restores
WORKDIR /src

# Restore .NET packages
COPY Itransition_task6/Itransition_task6.csproj Itransition_task6/
RUN dotnet restore Itransition_task6/Itransition_task6.csproj

# Copy remaining source code
COPY . .

# Move to project folder for asset compilation and compilation
WORKDIR /src/Itransition_task6

# Compile Tailwind CSS output into wwwroot
RUN npx @tailwindcss/cli -i ./wwwroot/css/site.css -o ./wwwroot/css/app.css

# Publish compiled ASP.NET Core binaries
RUN dotnet publish Itransition_task6.csproj -c Release -o /app/publish /p:UseAppHost=false

# Step 2: Lightweight Runtime Container
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Fix for Render inotify limits & bind port
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Itransition_task6.dll"]
