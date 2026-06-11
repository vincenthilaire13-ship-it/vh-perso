// ════════════════════════════════════════════════════════════════════════════
//  VH ADMINISTRATIF — Fonction "gardien" (Vercel Serverless Function)
//  Rôle : recevoir une demande de l'application, y ajouter la clé API secrète
//  (stockée dans Vercel sous ANTHROPIC_API_KEY, jamais dans le code),
//  appeler l'IA Anthropic, et renvoyer la réponse. La clé n'est JAMAIS
//  visible côté navigateur.
//  Même principe que BK Tech (api/ia.js).
// ════════════════════════════════════════════════════════════════════════════

export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
  maxDuration: 60
};

export default async function handler(req, res) {
  // CORS basique (même origine en prod, mais on autorise les pré-vols)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    return res.status(500).json({ error: 'Clé API absente côté serveur (ANTHROPIC_API_KEY non configurée dans Vercel).' });
  }

  try {
    // Le corps reçu de l'app contient déjà le tableau "messages" (avec le PDF/image
    // en base64) et éventuellement un "system". On relaie tel quel vers Anthropic.
    const { messages, system, model, max_tokens } = req.body || {};
    if (!messages) return res.status(400).json({ error: 'Champ "messages" manquant.' });

    const payload = {
      model: model || 'claude-sonnet-4-5',
      max_tokens: max_tokens || 2000,
      messages
    };
    if (system) payload.system = system;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: (data && data.error && data.error.message) || 'Erreur API Anthropic', detail: data });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Exception serveur : ' + (e && e.message ? e.message : String(e)) });
  }
}
