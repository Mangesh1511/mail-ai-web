// Use the deployed backend outside local development. When running locally,
// leave the URL empty so the app can discover the Spring Boot server.
const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
window.mailAiConfig = {
  apiBaseUrl: isLocalDevelopment ? '' : 'https://email-ai-service-611305868330.asia-southeast1.run.app',
};
