/**
 * Algoritmo de recomendação de salas.
 *
 * Cruza 3 fatores para gerar uma pontuação de 0 a 100 por sala:
 *  - Adequação da lotação (alunos x vagas): evita salas superdimensionadas
 *  - Equilíbrio de ocupação: favorece salas menos utilizadas recentemente
 *  - Recursos: salas sem os recursos exigidos são descartadas; recursos
 *    não solicitados reduzem a nota (preserva salas especializadas)
 */

export const RECOMMENDATION_WEIGHTS = {
  fit: 0.4,
  balance: 0.35,
  resources: 0.25,
} as const;

/** Faixa de preenchimento considerada ideal (70% a 100% da lotação). */
const IDEAL_FILL_MIN = 0.7;
/** Penalidade por recurso extra não solicitado. */
const EXTRA_RESOURCE_PENALTY = 10;
const MAX_EXTRA_RESOURCE_PENALTY = 60;

export interface RecommendableRoom {
  id: string;
  capacity: number;
  resources: { id: string }[];
  /** Taxa de ocupação recente (0-100). */
  occupancy: number;
}

export interface RecommendationCriteria {
  students?: number;
  requiredResourceIds?: string[];
}

export interface RoomRecommendation {
  score: number;
  reasons: string[];
}

export function isRecommendationActive(c: RecommendationCriteria): boolean {
  return (
    (c.students !== undefined && c.students > 0) ||
    (c.requiredResourceIds?.length ?? 0) > 0
  );
}

/** Retorna null se a sala não atende aos requisitos mínimos. */
export function scoreRoom(
  room: RecommendableRoom,
  criteria: RecommendationCriteria,
): RoomRecommendation | null {
  const { students, requiredResourceIds = [] } = criteria;
  const reasons: string[] = [];

  // Requisitos obrigatórios
  if (students && room.capacity < students) return null;
  const roomResourceIds = new Set(room.resources.map((r) => r.id));
  if (!requiredResourceIds.every((id) => roomResourceIds.has(id))) return null;

  // 1. Adequação da lotação
  let fit = 100;
  if (students && students > 0) {
    const fill = students / room.capacity;
    fit = fill >= IDEAL_FILL_MIN ? 100 : (fill / IDEAL_FILL_MIN) * 100;
    if (fill >= IDEAL_FILL_MIN) {
      reasons.push(`Lotação ideal (${Math.round(fill * 100)}% das vagas)`);
    } else if (fill < 0.4) {
      reasons.push('Sala muito maior que a turma');
    }
  }

  // 2. Equilíbrio de ocupação
  const balance = 100 - Math.min(100, Math.max(0, room.occupancy));
  if (room.occupancy <= 30) reasons.push('Baixa taxa de ocupação');
  else if (room.occupancy >= 70) reasons.push('Alta taxa de ocupação');

  // 3. Recursos
  const extras = room.resources.length - requiredResourceIds.length;
  const resources =
    100 - Math.min(MAX_EXTRA_RESOURCE_PENALTY, extras * EXTRA_RESOURCE_PENALTY);
  if (requiredResourceIds.length > 0) {
    reasons.push('Possui todos os recursos solicitados');
  }

  const w = RECOMMENDATION_WEIGHTS;
  const score = Math.round(
    fit * w.fit + balance * w.balance + resources * w.resources,
  );

  return { score, reasons };
}

/** Filtra salas incompatíveis e ordena da mais para a menos recomendada. */
export function recommendRooms<T extends RecommendableRoom>(
  rooms: T[],
  criteria: RecommendationCriteria,
): (T & { recommendation: RoomRecommendation })[] {
  return rooms
    .map((room) => {
      const recommendation = scoreRoom(room, criteria);
      return recommendation ? { ...room, recommendation } : null;
    })
    .filter((r): r is T & { recommendation: RoomRecommendation } => r !== null)
    .sort(
      (a, b) =>
        b.recommendation.score - a.recommendation.score ||
        a.occupancy - b.occupancy,
    );
}
