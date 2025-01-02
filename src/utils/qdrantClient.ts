import { QdrantClient } from '@qdrant/js-client-rest'

// Create a Qdrant client instance
export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
})
