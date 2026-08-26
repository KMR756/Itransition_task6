# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Copy project file and restore .NET packages
COPY ["Itransition_task6/Itransition_task6.csproj", "Itransition_task6/"]
RUN dotnet restore "Itransition_task6/Itransition_task6.csproj"

# Copy full repository source
COPY . .

# Move into inner project folder
WORKDIR "/src/Itransition_task6"

# Install Node dependencies & execute static Tailwind build script
RUN npm install
RUN npm run build:css

# Publish .NET Release build
RUN dotnet publish "Itransition_task6.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Production Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Itransition_task6.dll"]