export function projectedAuraGain(auraOpportunityScore: number): number {
  return Math.round(auraOpportunityScore * 100);
}
