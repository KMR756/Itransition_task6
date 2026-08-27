# Step 1: Build .NET App + Tailwind CSS
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Install Node.js for Tailwind CLI
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Restore NPM packages
COPY package*.json ./
RUN npm ci

# Restore .NET packages (includes MailKit)
COPY Itransition_Task4/Itransition_Task4.csproj Itransition_Task4/
RUN dotnet restore Itransition_Task4/Itransition_Task4.csproj

# Copy remaining source code
COPY . .

# Compile Tailwind CSS output into wwwroot
RUN npx @tailwindcss/cli -i ./Itransition_Task4/Styles/input.css -o ./Itransition_Task4/wwwroot/css/site.css

# Publish compiled ASP.NET Core binaries
WORKDIR /src/Itransition_Task4
RUN dotnet publish Itransition_Task4.csproj -c Release -o /app/publish /p:UseAppHost=false

# Step 2: Lightweight Runtime Container
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Fix for Render inotify limits & bind port
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Itransition_Task6.dll"]
