# Use .NET 10.0 SDK for building
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj file and restore dependencies
COPY ["Itransition_task6/Itransition_task6.csproj", "Itransition_task6/"]
RUN dotnet restore "Itransition_task6/Itransition_task6.csproj"

# Copy everything else
COPY Itransition_task6/ Itransition_task6/

# Install Node.js (since you have package.json and node_modules)
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install npm dependencies
WORKDIR "/src/Itransition_task6"
COPY package*.json ./
RUN npm ci || npm install

# Build the application
RUN dotnet build "Itransition_task6.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "Itransition_task6.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final runtime image - use ASP.NET 10.0
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Copy published files
COPY --from=publish /app/publish .

# Copy node_modules if needed for runtime
COPY --from=build /src/Itransition_task6/node_modules ./node_modules 2>/dev/null || true

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "Itransition_task6.dll"]
