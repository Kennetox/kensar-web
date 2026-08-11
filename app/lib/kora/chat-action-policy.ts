export type KoraActionDisplayPolicy = {
  api_action_limit: number;
  suggestion_limit: number;
  total_limit: number;
};

export function getKoraActionDisplayPolicy(intent: string, apiActionCount: number): KoraActionDisplayPolicy {
  if (intent === "menu") {
    return { api_action_limit: 5, suggestion_limit: apiActionCount > 0 ? 0 : 2, total_limit: 5 };
  }
  if (apiActionCount > 0) {
    return { api_action_limit: 2, suggestion_limit: 0, total_limit: 2 };
  }
  return { api_action_limit: 0, suggestion_limit: 2, total_limit: 2 };
}
