import { Index } from "@upstash/vector";

let _vectorIndex: Index | null = null;

export function getVectorIndex(): Index {
  if (!_vectorIndex) {
    _vectorIndex = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
  }
  return _vectorIndex;
}
