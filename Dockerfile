# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Install Node.js for Tailwind CSS processing
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Copy project file from subfolder and restore dependencies
COPY ["Itransition_task6/Itransition_task6.csproj", "Itransition_task6/"]
RUN dotnet restore "Itransition_task6/Itransition_task6.csproj"

# Copy all repository contents
COPY . .

# Move into project directory for NPM & .NET Build
WORKDIR "/src/Itransition_task6"
RUN npm install
RUN npm run css
RUN dotnet publish "Itransition_task6.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime Environment
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Itransition_task6.dll"]