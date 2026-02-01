import { queryOne } from '@/infrastructure/db/query';

export const upsertEmbedding = async (data: { scope: string; refId: string; vector: number[] }) => {
  // pgvector accepts string literal like '[1,2,3]'
  const vectorLiteral = `[${data.vector.join(',')}]`;
  return queryOne(
    `INSERT INTO embedding (scope, ref_id, vector, updated_at)
     VALUES ($1, $2, $3::vector, now())
     ON CONFLICT (scope, ref_id)
     DO UPDATE SET vector = EXCLUDED.vector, updated_at = now()
     RETURNING *`,
    [data.scope, data.refId, vectorLiteral]
  );
};
