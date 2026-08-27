# Multi-stage build for .NET Core + Node.js
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["Itransition_task6/Itransition_task6.csproj", "Itransition_task6/"]
RUN dotnet restore "Itransition_task6/Itransition_task6.csproj"

# Copy everything else and build
COPY Itransition_task6/ Itransition_task6/
WORKDIR "/src/Itransition_task6"

# Install Node.js and npm (for client-side dependencies)
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install npm dependencies (if package.json exists)
COPY package*.json ./
RUN if [ -f "package.json" ]; then npm ci || npm install; fi

# Build the .NET application
RUN dotnet build "Itransition_task6.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "Itransition_task6.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published files
COPY --from=publish /app/publish .

# Copy node_modules if they exist
COPY --from=build /src/Itransition_task6/node_modules ./node_modules 2>/dev/null || true

# Set environment variable
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "Itransition_task6.dll"]
